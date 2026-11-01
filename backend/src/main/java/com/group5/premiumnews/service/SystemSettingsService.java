package com.group5.premiumnews.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** UC-37: chỉ cho sửa khóa có consumer thực tế; không biến mọi row DB thành cấu hình tùy ý. */
@Service
public class SystemSettingsService {
    static final Map<String,Long> LIMITS=Map.of("creative.max.image.bytes",52428800L,"creative.max.video.bytes",524288000L);
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public SystemSettingsService(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
    public record Change(@NotNull @Size(max=100) String value,@NotNull @PositiveOrZero Long version,
        boolean restoreDefault,@NotBlank @Size(max=500) String reason){}

    /** Catalog gồm kiểu/default/giới hạn/cách áp dụng, phiên bản và người cập nhật; khóa hạ tầng chỉ xem. */
    @PreAuthorize("hasRole('ADMINISTRATOR')") @Transactional(readOnly=true)
    public Map<String,Object> catalog(){
        var rows=jdbc.queryForList("SELECT s.*,u.username updatedBy FROM system_settings s LEFT JOIN users u ON u.user_id=s.updated_by ORDER BY s.setting_key");
        rows.forEach(r->{String key=(String)r.get("setting_key");boolean editable=Boolean.TRUE.equals(r.get("is_editable"))&&LIMITS.containsKey(key);
            r.put("editable",editable);r.put("group",key.startsWith("creative.")?"Tệp quảng cáo":key.startsWith("payment.")?"Thanh toán":"Vận hành");
            r.put("application",editable?"Áp dụng cho lần upload mới ngay sau khi lưu. Trần HTTP hiện tại 8 MB; tệp cũ giữ nguyên.":"Chỉ xem: khóa này chưa có consumer cấu hình động trong phiên bản hiện tại.");
            if(editable){r.put("min",1);r.put("max",LIMITS.get(key));r.put("effectiveBytes",Math.min(readConfigured(key),8L*1024*1024));}});
        var history=jdbc.queryForList("SELECT a.audit_log_id,a.entity_id,a.old_value,a.new_value,a.reason,a.created_at,u.username actor FROM audit_logs a LEFT JOIN users u ON u.user_id=a.actor_id WHERE a.entity_type='SYSTEM_SETTING' ORDER BY a.audit_log_id DESC LIMIT 50");
        return Map.of("settings",rows,"history",history);
    }

    /** Khóa row, so version, kiểm catalog rồi ghi value+audit cùng transaction; hủy không gọi hàm này. */
    @PreAuthorize("hasRole('ADMINISTRATOR')") @Transactional
    public void update(AuthenticatedUserPrincipal actor,String key,Change request){
        var rows=jdbc.queryForList("SELECT * FROM system_settings WHERE setting_key=? FOR UPDATE",key);
        if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không có khóa cài đặt này.");
        var old=rows.getFirst();
        if(!LIMITS.containsKey(key)||!Boolean.TRUE.equals(old.get("is_editable")))throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Khóa này chỉ được xem, chưa cho phép chỉnh sửa.");
        AccessAdministrationService.version(Map.of("version",old.get("edit_version")),request.version());
        String value=request.restoreDefault()?(String)old.get("default_value"):request.value();
        value=validate(key,value);
        jdbc.update("UPDATE system_settings SET setting_value=?,updated_by=?,edit_version=edit_version+1,updated_at=CURRENT_TIMESTAMP(6) WHERE setting_key=?",value,actor.id(),key);
        try{jdbc.update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,old_value,new_value,reason) VALUES(?,'UPDATE_SETTING','SYSTEM_SETTING',?,?,?,?)",actor.id(),key,mapper.writeValueAsString(Map.of("value",old.get("setting_value"))),mapper.writeValueAsString(Map.of("value",value)),request.reason().trim());}
        catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Không thể ghi lịch sử cấu hình.",e);}
    }

    /** Bộ kiểm dùng lại khi đọc runtime: chỉ số nguyên dương trong catalog, không nhận exponent/decimal/âm. */
    static String validate(String key,String value){
        try{if(!LIMITS.containsKey(key)||value==null||!value.matches("[0-9]{1,10}"))throw new IllegalArgumentException();
            long number=Long.parseLong(value);if(number<1||number>LIMITS.get(key))throw new IllegalArgumentException();return String.valueOf(number);
        }catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Giá trị phải là số nguyên từ 1 đến "+LIMITS.getOrDefault(key,0L)+" byte.");}
    }
    private long readConfigured(String key){var values=jdbc.queryForList("SELECT setting_value FROM system_settings WHERE setting_key=?",String.class,key);return values.isEmpty()?8L*1024*1024:Long.parseLong(validate(key,values.getFirst()));}
    /** Không cache: lần upload kế tiếp dùng ngay cấu hình mới; vẫn tuân thủ trần multipart 8 MB. */
    public long uploadLimit(boolean video){return Math.min(8L*1024*1024,readConfigured(video?"creative.max.video.bytes":"creative.max.image.bytes"));}
}
