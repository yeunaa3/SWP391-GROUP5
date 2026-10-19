package com.group5.premiumnews.service;

import com.group5.premiumnews.exception.InvalidStateTransitionException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.security.MessageDigest;
import java.util.*;

@Service
public class BusinessFileService {
    private final JdbcTemplate jdbc; private final BusinessWorkspaceService business;
    private final BusinessAssetStorage storage;
    /** Service quản lý metadata/quyền; storage adapter chịu trách nhiệm vị trí và cách lưu bytes. */
    public BusinessFileService(JdbcTemplate jdbc,BusinessWorkspaceService business,BusinessAssetStorage storage) {
        this.jdbc=jdbc;this.business=business;this.storage=storage;
    }
    /** Dùng storage adapter để checklist/review kiểm tra cả asset local và cloud. */
    public boolean available(String key){return storage.available(key);}
    /** Lưu tài liệu pháp lý thành phiên bản mới; đổi hồ sơ đã duyệt sẽ yêu cầu xét duyệt lại. */
    @Transactional(rollbackFor=Exception.class) @PreAuthorize("hasRole('BUSINESS')")
    public Map<String,Object> document(AuthenticatedUserPrincipal user,MultipartFile file) throws Exception {
        Long company=business.requireCompany(user);
        String state=jdbc.queryForObject("SELECT application_status FROM companies WHERE company_id=? FOR UPDATE",String.class,company);
        if("APPROVED".equals(state)) {
            // Đổi tài liệu pháp lý làm mất eligibility tạm thời; snapshot/document cũ vẫn giữ nguyên.
            jdbc.update("UPDATE companies SET application_status='NEEDS_REVISION',review_note=? WHERE company_id=?","Đã thay tài liệu pháp lý, cần gửi xét duyệt lại.",company);
        } else if(!List.of("DRAFT","NEEDS_REVISION").contains(state)) throw new InvalidStateTransitionException("Hồ sơ đang duyệt không được thay tài liệu.");
        Stored stored=store(file,true);
        try {
            Integer version=jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM company_documents WHERE company_id=? AND document_type='LEGAL'",Integer.class,company);
            // Snapshot nộp trước vẫn trỏ ID cũ; vòng nộp mới chỉ dùng bản đang ACTIVE.
            jdbc.update("UPDATE company_documents SET status='REPLACED' WHERE company_id=? AND document_type='LEGAL' AND status='ACTIVE'",company);
            jdbc.update("INSERT INTO company_documents(company_id,document_type,original_file_name,storage_object_key,media_url,mime_type,file_size,checksum_sha256,version_no,uploaded_by) VALUES(?,'LEGAL',?,?,?,?,?,?,?,?)",
                company,safeName(file.getOriginalFilename()),stored.key(),"pending",stored.mime(),file.getSize(),stored.sha(),version,user.id());
            Long id=jdbc.queryForObject("SELECT document_id FROM company_documents WHERE company_id=? AND document_type='LEGAL' AND version_no=?",Long.class,company,version);
            String url="/api/media/document/"+id;jdbc.update("UPDATE company_documents SET media_url=? WHERE document_id=?",url,id);
            return Map.of("id",id,"url",url);
        } catch(RuntimeException ex) { discardFailed(stored.key(),ex);throw ex; }
    }
    /** Khóa campaign, kiểm tra version/quyền/URL/kích thước thật rồi tạo creative version mới. */
    @Transactional(rollbackFor=Exception.class) @PreAuthorize("hasRole('BUSINESS')")
    public Map<String,Object> creative(AuthenticatedUserPrincipal user,Long campaign,MultipartFile file,String targetUrl,Integer editVersion) throws Exception {
        Map<String,Object> current=business.ownedCampaign(user,campaign,true);business.requireEditable(current);
        CampaignWorkflowService.requireVersion(current,editVersion);
        CampaignWorkflowService.validateUrl(targetUrl);
        Map<String,Object> slot=jdbc.queryForMap("SELECT s.* FROM ad_slots s JOIN contracts ct ON ct.slot_id=s.slot_id WHERE ct.contract_id=?",current.get("contract_id"));
        Stored stored=store(file,false);
        if(stored.width()!=((Number)slot.get("width_px")).intValue() || stored.height()!=((Number)slot.get("height_px")).intValue()) {
            var error=new InvalidStateTransitionException("Creative phải có kích thước "+slot.get("width_px")+" × "+slot.get("height_px")+" px theo vị trí hợp đồng.");
            discardFailed(stored.key(),error);throw error;
        }
        try {
            Integer version=jdbc.queryForObject("SELECT COALESCE(MAX(version_no),0)+1 FROM ad_creatives WHERE campaign_id=?",Integer.class,campaign);
            jdbc.update("INSERT INTO ad_creatives(campaign_id,version_no,creative_type,title,media_url,media_object_key,target_url,mime_type,file_size,width_px,height_px,checksum_sha256) VALUES(?,?,'IMAGE',?,?,?,?,?,?,?,?,?)",
                campaign,version,current.get("campaign_name"),"pending",stored.key(),targetUrl,stored.mime(),file.getSize(),stored.width(),stored.height(),stored.sha());
            Long id=jdbc.queryForObject("SELECT creative_id FROM ad_creatives WHERE campaign_id=? AND version_no=?",Long.class,campaign,version);
            String url="/api/media/creative/"+id;jdbc.update("UPDATE ad_creatives SET media_url=? WHERE creative_id=?",url,id);
            jdbc.update("UPDATE ad_creatives SET creative_type=? WHERE creative_id=?",stored.mime().startsWith("video/")?"VIDEO":"IMAGE",id);
            jdbc.update("UPDATE ad_campaigns SET target_url=?,edit_version=edit_version+1 WHERE campaign_id=?",targetUrl,campaign);
            jdbc.update("INSERT INTO campaign_activity(campaign_id,actor_id,action,note) VALUES(?,?,'UPLOAD_CREATIVE',?)",campaign,user.id(),"Đã tải creative v"+version);
            return Map.of("id",id,"version",version,"url",url);
        } catch(RuntimeException ex) { discardFailed(stored.key(),ex);throw ex; }
    }
    /** Tài liệu/nháp chỉ chủ sở hữu hoặc staff được mở; creative đã duyệt được đọc công khai. */
    public ResponseEntity<Resource> read(String kind,Long id,AuthenticatedUserPrincipal user) {
        List<Map<String,Object>> rows="document".equals(kind)
            ? jdbc.queryForList("SELECT storage_object_key AS file_key,mime_type,company_id,status FROM company_documents WHERE document_id=?",id)
            : jdbc.queryForList("SELECT cr.media_object_key AS file_key,cr.mime_type,ct.company_id,cr.status FROM ad_creatives cr JOIN ad_campaigns c ON c.campaign_id=cr.campaign_id JOIN contracts ct ON ct.contract_id=c.contract_id WHERE cr.creative_id=?",id);
        if(rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Map<String,Object> row=rows.getFirst();
        boolean publicImage="creative".equals(kind) && "APPROVED".equals(row.get("status"));
        boolean staff=user!=null && user.authorities().stream().anyMatch(a -> List.of("ROLE_AD_MANAGER","ROLE_ADMINISTRATOR").contains(a.getAuthority()));
        Long owner=user==null?null:jdbc.queryForObject("SELECT company_id FROM users WHERE user_id=?",Long.class,user.id());
        if(!publicImage && !staff && (owner==null || owner.longValue()!=((Number)row.get("company_id")).longValue())) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        String key=(String)row.get("file_key");
        try{return ResponseEntity.ok().header("Cache-Control","private, no-store").header("X-Content-Type-Options","nosniff")
            .contentType(MediaType.parseMediaType((String)row.get("mime_type"))).body(storage.read(key));}
        catch(Exception e){throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Tệp không còn khả dụng.");}
    }
    /** Kiểm magic bytes, kích thước ảnh/metadata video và giới hạn trước khi ghi storage. */
    private Stored store(MultipartFile file,boolean pdfAllowed) throws Exception {
        if(file.isEmpty() || file.getSize()>8*1024*1024) throw new InvalidStateTransitionException("Tệp phải từ 1 byte đến 8 MB.");
        byte[] bytes=file.getBytes();String mime;String extension;int width=0,height=0;
        if(bytes.length>5 && new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-") && pdfAllowed) {mime="application/pdf";extension="pdf";}
        else if(!pdfAllowed && bytes.length>12 && new String(bytes,4,4,java.nio.charset.StandardCharsets.US_ASCII).equals("ftyp")) {
            // MP4 được đọc metadata track bằng JCodec, không nhận dimensions từ tên tệp/client.
            try(var channel=org.jcodec.common.io.ByteBufferSeekableByteChannel.readFromByteBuffer(java.nio.ByteBuffer.wrap(bytes))) {
                var demux=org.jcodec.containers.mp4.demuxer.MP4Demuxer.createMP4Demuxer(channel);
                var track=demux.getVideoTrack();if(track==null)throw new IllegalArgumentException();
                var meta=track.getMeta();var size=meta.getVideoCodecMeta().getSize();width=size.getWidth();height=size.getHeight();
                if(width<=0||height<=0||(long)width*height>20_000_000||meta.getTotalDuration()<=0||meta.getTotalDuration()>60)throw new IllegalArgumentException();
            }catch(Exception e){throw new InvalidStateTransitionException("MP4 không hợp lệ hoặc dài quá 60 giây.");}
            mime="video/mp4";extension="mp4";
        } else {
            boolean png=bytes.length>8 && bytes[0]==(byte)137 && bytes[1]==80 && bytes[2]==78 && bytes[3]==71;
            boolean jpg=bytes.length>3 && bytes[0]==(byte)255 && bytes[1]==(byte)216 && bytes[2]==(byte)255;
            if(!png && !jpg) throw new InvalidStateTransitionException("Chỉ nhận PNG/JPEG"+(pdfAllowed?" hoặc PDF":" hoặc MP4 tối đa 60 giây")+".");
            try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext()) throw new InvalidStateTransitionException("Ảnh bị lỗi.");
                var reader=readers.next();try {reader.setInput(stream);width=reader.getWidth(0);height=reader.getHeight(0);
                    if(width<=0 || height<=0 || (long)width*height>20_000_000) throw new InvalidStateTransitionException("Ảnh quá lớn hoặc không hợp lệ.");reader.read(0);
                } finally {reader.dispose();}
            }
            mime=png?"image/png":"image/jpeg";extension=png?"png":"jpg";
        }
        String key=storage.put(bytes,mime,extension);
        String sha=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));return new Stored(key,mime,sha,width,height);
    }
    /** Bỏ đường dẫn và ký tự điều khiển trong tên hiển thị; tên object thực tế luôn do server cấp. */
    private String safeName(String name) { String value=name==null?"document":name.replace('\\','/');value=value.substring(value.lastIndexOf('/')+1).replaceAll("[\\p{Cntrl}]","");return value.substring(0,Math.min(value.length(),255)); }
    private record Stored(String key,String mime,String sha,int width,int height) {}
    /** Dọn object mới khi upload/DB thất bại; lỗi dọn không được che lỗi nghiệp vụ ban đầu. */
    private void discardFailed(String key,RuntimeException original){try{storage.remove(key);}catch(Exception cleanup){original.addSuppressed(cleanup);}}
}
