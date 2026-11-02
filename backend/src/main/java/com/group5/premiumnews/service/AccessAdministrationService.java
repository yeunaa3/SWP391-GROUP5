package com.group5.premiumnews.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** CFG-02: controller chỉ nhận dữ liệu; service chịu trách nhiệm RBAC, khóa, version và audit. */
@Service
@PreAuthorize("hasRole('ADMINISTRATOR')")
public class AccessAdministrationService {
    public static final Set<String> PERMISSIONS=Set.of("READER","SUBSCRIBER","BUSINESS","AD_MANAGER","ADMINISTRATOR");
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public AccessAdministrationService(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    public record UserChange(@NotBlank @Pattern(regexp="ACTIVE|INACTIVE|LOCKED") String status,
        @NotEmpty @Size(max=20) List<@NotNull @Positive Long> roleIds,@NotNull @PositiveOrZero Long version,
        @NotBlank @Size(max=500) String reason){}
    public record RoleChange(@NotBlank @Pattern(regexp="[A-Z][A-Z0-9_]{2,49}") String name,
        @NotBlank @Size(max=255) String description,@NotBlank @Pattern(regexp="ACTIVE|INACTIVE") String status,
        @NotEmpty @Size(max=5) List<String> permissions,@NotNull @PositiveOrZero Long version,
        @NotBlank @Size(max=500) String reason){}

    /** Tìm kiếm/filter/phân trang ở DB, trả thông tin công khai; tuyệt đối không trả hash mật khẩu. */
    @Transactional(readOnly=true)
    public Map<String,Object> list(String query,String status,String role,int page){
        if(query.length()>100 || page<0 || page>100000)bad("Bộ lọc không hợp lệ.");
        String term="%"+query.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        String where="""
            FROM users u LEFT JOIN companies c ON c.company_id=u.company_id
            WHERE (
                LOWER(u.username) LIKE ? ESCAPE '!'
                OR LOWER(u.email) LIKE ? ESCAPE '!'
                OR LOWER(COALESCE(u.full_name,'')) LIKE ? ESCAPE '!'
                OR LOWER(COALESCE(c.company_name,'')) LIKE ? ESCAPE '!'
                OR EXISTS(SELECT 1 FROM user_roles ur2 JOIN roles r2 ON r2.role_id=ur2.role_id WHERE ur2.user_id=u.user_id AND (LOWER(r2.role_name) LIKE ? ESCAPE '!' OR LOWER(COALESCE(r2.description,'')) LIKE ? ESCAPE '!'))
            )
            AND (?='' OR u.status=?)
            AND (?='' OR EXISTS(
                SELECT 1 FROM user_roles ur
                JOIN roles r ON r.role_id=ur.role_id
                LEFT JOIN role_permissions rp ON rp.role_id=r.role_id
                WHERE ur.user_id=u.user_id
                AND (LOWER(r.role_name)=LOWER(?) OR LOWER(rp.permission_code)=LOWER(?))
            ))
            """;
        Object[] args={term,term,term,term,term,term,status,status,role,role,role};
        var count=jdbc.queryForObject("SELECT COUNT(*) "+where,Long.class,args);
        var bind=new ArrayList<>(Arrays.asList(args));bind.add(page*20);
        var users=jdbc.queryForList("SELECT u.user_id id,u.username,u.full_name fullName,u.email,u.company_id companyId,c.company_name companyName,u.status,u.access_version version "+where+" ORDER BY u.user_id DESC LIMIT 20 OFFSET ?",bind.toArray());
        users.forEach(u->u.put("roleIds",jdbc.queryForList("SELECT role_id FROM user_roles WHERE user_id=? ORDER BY role_id",Long.class,u.get("id"))));
        return Map.of("users",users,"total",count,"page",page,"size",20,"roles",roles(),"permissions",PERMISSIONS.stream().sorted().toList());
    }

    /** Đọc toàn bộ role/capability để người quản trị biết tác động trước khi xác nhận. */
    public List<Map<String,Object>> roles(){
        var rows=jdbc.queryForList("SELECT role_id id,role_name name,description,status,edit_version version FROM roles ORDER BY role_id");
        rows.forEach(r->{r.put("permissions",jdbc.queryForList("SELECT permission_code FROM role_permissions WHERE role_id=? ORDER BY permission_code",String.class,r.get("id")));r.put("builtIn",PERMISSIONS.contains(r.get("name")));});
        return rows;
    }

    /** Khóa cùng một tập role trước mọi thay đổi quyền để hai admin không đồng thời loại bỏ nhau. */
    private void lockAccessCatalog(){jdbc.queryForList("SELECT role_id FROM roles ORDER BY role_id FOR UPDATE");}

    /** Cập nhật role/status; company chỉ hiển thị, không cho chuyển ownership doanh nghiệp từ màn quản trị. */
    @Transactional
    public void updateUser(AuthenticatedUserPrincipal actor,long id,UserChange change){
        lockAccessCatalog();
        var old=one("SELECT user_id,status,company_id,access_version version FROM users WHERE user_id=? FOR UPDATE",id);
        version(old,change.version());
        var ids=change.roleIds().stream().distinct().sorted().toList();
        for(long role:ids)if(jdbc.queryForObject("SELECT COUNT(*) FROM roles WHERE role_id=? AND status='ACTIVE'",Integer.class,role)==0)bad("Role không còn hoạt động. Hãy tải lại.");
        old.put("roleIds",jdbc.queryForList("SELECT role_id FROM user_roles WHERE user_id=? ORDER BY role_id",Long.class,id));
        jdbc.update("DELETE FROM user_roles WHERE user_id=?",id);
        for(long role:ids)jdbc.update("INSERT INTO user_roles(user_id,role_id) VALUES(?,?)",id,role);
        jdbc.update("UPDATE users SET status=?,access_version=access_version+1 WHERE user_id=?",change.status(),id);
        requireAdministrator();
        audit(actor,"UPDATE_ACCESS","USER",id,old,Map.of("status",change.status(),"roleIds",ids),change.reason());
    }

    /** Role mới dùng năng lực có trong catalog; role hệ thống giữ nguyên tên/năng lực để không phá các BF. */
    @Transactional
    public void saveRole(AuthenticatedUserPrincipal actor,Long id,RoleChange change){
        lockAccessCatalog();validatePermissions(change.permissions());
        var old=id==null?new HashMap<String,Object>():one("SELECT role_id id,role_name name,description,status,edit_version version FROM roles WHERE role_id=? FOR UPDATE",id);
        if(id!=null){
            version(old,change.version());
            var previous=jdbc.queryForList("SELECT permission_code FROM role_permissions WHERE role_id=? ORDER BY permission_code",String.class,id);old.put("permissions",previous);
            if(PERMISSIONS.contains(old.get("name")) && (!old.get("name").equals(change.name()) || !new HashSet<>(previous).equals(new HashSet<>(change.permissions()))))bad("Role hệ thống giữ nguyên mã và năng lực; tạo role mới nếu cần nhóm quyền khác.");
        }else if(PERMISSIONS.contains(change.name()))bad("Mã role hệ thống đã được dành riêng.");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM roles WHERE role_name=? AND role_id<>?",Integer.class,change.name(),id==null?0:id)>0)throw new ConflictException("Mã role đã tồn tại.");
        if(id==null){jdbc.update("INSERT INTO roles(role_name,description,status) VALUES(?,?,?)",change.name(),change.description().trim(),change.status());id=jdbc.queryForObject("SELECT role_id FROM roles WHERE role_name=?",Long.class,change.name());}
        else jdbc.update("UPDATE roles SET role_name=?,description=?,status=?,edit_version=edit_version+1 WHERE role_id=?",change.name(),change.description().trim(),change.status(),id);
        jdbc.update("DELETE FROM role_permissions WHERE role_id=?",id);
        for(String p:new TreeSet<>(change.permissions()))jdbc.update("INSERT INTO role_permissions(role_id,permission_code) VALUES(?,?)",id,p);
        requireAdministrator();
        // Membership version tăng cùng quyền role, do đó form user mở ở tab cũ cũng phải tải lại.
        jdbc.update("UPDATE users SET access_version=access_version+1 WHERE user_id IN (SELECT user_id FROM user_roles WHERE role_id=?)",id);
        audit(actor,"SAVE_ROLE","ROLE",id,old,Map.of("name",change.name(),"status",change.status(),"description",change.description().trim(),"permissions",change.permissions()),change.reason());
    }

    static void validatePermissions(List<String> values){if(values==null || values.isEmpty() || !PERMISSIONS.containsAll(values))bad("Năng lực không thuộc catalog được phép.");}
    /** Kiểm tra sau mutation trong transaction; lỗi làm rollback cả role/status/audit. */
    private void requireAdministrator(){
        if(jdbc.queryForObject("SELECT COUNT(DISTINCT u.user_id) FROM users u JOIN user_roles ur ON ur.user_id=u.user_id JOIN roles r ON r.role_id=ur.role_id JOIN role_permissions p ON p.role_id=r.role_id WHERE u.status='ACTIVE' AND r.status='ACTIVE' AND p.permission_code='ADMINISTRATOR'",Integer.class)==0)bad("Không được loại bỏ quản trị viên hoạt động cuối cùng.");
    }
    static void version(Map<String,Object> row,Long expected){if(expected==null || ((Number)row.get("version")).longValue()!=expected)throw new ConflictException("Dữ liệu đã thay đổi. Hãy tải lại trước khi lưu.");}
    private Map<String,Object> one(String sql,long id){var rows=jdbc.queryForList(sql,id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Không tìm thấy bản ghi.");return rows.getFirst();}
    /** Lưu before/after không chứa dữ liệu mật khẩu; lỗi audit phải rollback thay đổi quyền. */
    private void audit(AuthenticatedUserPrincipal actor,String action,String type,long id,Object old,Object next,String reason){
        try{jdbc.update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,old_value,new_value,reason) VALUES(?,?,?,?,?,?,?)",actor.id(),action,type,String.valueOf(id),json.writeValueAsString(old),json.writeValueAsString(next),reason.trim());}
        catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Không thể ghi lịch sử.",e);}
    }
    private static void bad(String message){throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,message);}
}
