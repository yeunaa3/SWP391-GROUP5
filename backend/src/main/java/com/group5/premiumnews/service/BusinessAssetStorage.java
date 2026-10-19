package com.group5.premiumnews.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.*;

/** Storage adapter: local cho dev hoặc Cloudinary authenticated cho triển khai có cấu hình. */
@Component
public class BusinessAssetStorage {
    private final Path root;
    private final String provider,cloud,key,secret;
    private final ObjectMapper mapper;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    public BusinessAssetStorage(@Value("${app.upload-directory:storage/business}") String directory,
            @Value("${app.storage.provider:local}") String provider,
            @Value("${CLOUDINARY_CLOUD_NAME:}") String cloud,@Value("${CLOUDINARY_API_KEY:}") String key,
            @Value("${CLOUDINARY_API_SECRET:}") String secret,ObjectMapper mapper){
        this.root=Path.of(directory).toAbsolutePath().normalize();this.provider=provider.trim().toLowerCase(Locale.ROOT);
        if(!Set.of("local","cloudinary").contains(this.provider))throw new IllegalArgumentException("Storage provider phải là local hoặc cloudinary.");
        this.cloud=cloud;this.key=key;this.secret=secret;this.mapper=mapper;
    }

    /** Lưu file đã qua kiểm tra; đăng ký bù trừ xóa object mới nếu DB transaction rollback. */
    public String put(byte[] bytes,String mime,String extension) throws Exception {
        String id=UUID.randomUUID().toString(),object;
        if("cloudinary".equals(provider)) {
            if(!cloud.matches("[A-Za-z0-9_-]+")||key.isBlank()||secret.isBlank())throw new IllegalStateException("Chưa cấu hình Cloudinary cho kho tệp.");
            String resource=mime.startsWith("video/")?"video":mime.equals("application/pdf")?"raw":"image";
            String publicId="pulse/"+id+(resource.equals("raw")?"."+extension:"");
            var params=new TreeMap<String,String>(); params.put("public_id",publicId);params.put("timestamp",String.valueOf(System.currentTimeMillis()/1000));params.put("type","authenticated");
            var payload=multipart(params,bytes,mime,"asset."+extension);
            var response=http.send(HttpRequest.newBuilder(URI.create("https://api.cloudinary.com/v1_1/"+cloud+"/"+resource+"/upload"))
                .timeout(Duration.ofSeconds(45)).header("Content-Type","multipart/form-data; boundary=pulse-boundary").POST(HttpRequest.BodyPublishers.ofByteArray(payload)).build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()/100!=2)throw new IllegalStateException("Kho tệp cloud không nhận được upload. Hãy thử lại.");
            var data=mapper.readTree(response.body());if(!publicId.equals(data.path("public_id").asText()))throw new IllegalStateException("Kho tệp trả về ID không hợp lệ.");
            object="cloud:"+resource+":"+publicId;
        } else {
            object=id+"."+extension; Files.createDirectories(root);Files.write(path(object),bytes,StandardOpenOption.CREATE_NEW);
        }
        final String saved=object;
        if(TransactionSynchronizationManager.isSynchronizationActive())TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCompletion(int state){if(state!=STATUS_COMMITTED)try{remove(saved);}catch(Exception ignored){/* Object chưa được DB link; có thể dọn lại theo retention. */}}
        });
        return object;
    }

    /** Đọc qua endpoint đã kiểm tra quyền; authenticated URL chỉ được gọi phía server. */
    public Resource read(String object) throws Exception {
        if(object.startsWith("cloud:")) {
            var response=http.send(HttpRequest.newBuilder(delivery(object)).timeout(Duration.ofSeconds(30)).GET().build(),HttpResponse.BodyHandlers.ofByteArray());
            if(response.statusCode()!=200)throw new java.io.FileNotFoundException(); return new ByteArrayResource(response.body());
        }
        if(!Files.isRegularFile(path(object)))throw new java.io.FileNotFoundException();return new FileSystemResource(path(object));
    }

    /** HEAD/local existence được dùng lại trước submit; lỗi storage không được coi là asset hợp lệ. */
    public boolean available(String object){
        if(object==null)return false;
        try{if(object.startsWith("cloud:"))return http.send(HttpRequest.newBuilder(delivery(object)).timeout(Duration.ofSeconds(10)).method("HEAD",HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.discarding()).statusCode()==200;
            return Files.isRegularFile(path(object));}catch(Exception e){return false;}
    }

    /** Chỉ xóa object mới do lần upload thất bại; không dùng để xóa asset đang có lịch sử. */
    public void remove(String object) throws Exception {
        if(!object.startsWith("cloud:")){Files.deleteIfExists(path(object));return;}
        String[] p=object.split(":",3);var params=new TreeMap<String,String>();params.put("public_id",p[2]);params.put("timestamp",String.valueOf(System.currentTimeMillis()/1000));params.put("type","authenticated");
        byte[] body=multipart(params,null,null,null);
        http.send(HttpRequest.newBuilder(URI.create("https://api.cloudinary.com/v1_1/"+cloud+"/"+p[1]+"/destroy")).timeout(Duration.ofSeconds(20)).header("Content-Type","multipart/form-data; boundary=pulse-boundary").POST(HttpRequest.BodyPublishers.ofByteArray(body)).build(),HttpResponse.BodyHandlers.discarding());
    }
    /** Giới hạn key local vào UUID, không cho client/DB dẫn đường ra ngoài upload root. */
    private Path path(String object){if(!object.matches("[a-f0-9-]+\\.(png|jpg|pdf|mp4)"))throw new IllegalArgumentException("Object key không hợp lệ.");return root.resolve(object);}
    /** Cloudinary ký đường dẫn authenticated; không trả URL ký hoặc secret về frontend. */
    private URI delivery(String object) throws Exception {
        String[] p=object.split(":",3);if(p.length!=3||!p[1].matches("image|video|raw")||!p[2].matches("pulse/[a-f0-9-]+(\\.pdf)?"))throw new IllegalArgumentException();
        String sig=Base64.getUrlEncoder().withoutPadding().encodeToString(MessageDigest.getInstance("SHA-1").digest((p[2]+secret).getBytes(StandardCharsets.UTF_8))).substring(0,8);
        return URI.create("https://res.cloudinary.com/"+cloud+"/"+p[1]+"/authenticated/s--"+sig+"--/"+p[2]);
    }
    /** Ký sorted upload params bằng API secret; file/API key không nằm trong chuỗi chữ ký. */
    private byte[] multipart(TreeMap<String,String> params,byte[] file,String mime,String name) throws Exception {
        String signed=params.entrySet().stream().map(e->e.getKey()+"="+e.getValue()).reduce((a,b)->a+"&"+b).orElse("")+secret;
        var all=new LinkedHashMap<>(params);all.put("api_key",key);all.put("signature",HexFormat.of().formatHex(MessageDigest.getInstance("SHA-1").digest(signed.getBytes(StandardCharsets.UTF_8))));
        var out=new ByteArrayOutputStream();for(var e:all.entrySet())out.write(("--pulse-boundary\r\nContent-Disposition: form-data; name=\""+e.getKey()+"\"\r\n\r\n"+e.getValue()+"\r\n").getBytes(StandardCharsets.UTF_8));
        if(file!=null){out.write(("--pulse-boundary\r\nContent-Disposition: form-data; name=\"file\"; filename=\""+name+"\"\r\nContent-Type: "+mime+"\r\n\r\n").getBytes(StandardCharsets.UTF_8));out.write(file);out.write("\r\n".getBytes(StandardCharsets.UTF_8));}
        out.write("--pulse-boundary--\r\n".getBytes(StandardCharsets.UTF_8));return out.toByteArray();
    }
}
