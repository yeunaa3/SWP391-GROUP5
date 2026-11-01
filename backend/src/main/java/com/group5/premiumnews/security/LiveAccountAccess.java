package com.group5.premiumnews.security;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/** UC-34: DB là nguồn quyền hiện hành, kể cả role tùy chỉnh được ánh xạ sang năng lực đã có. */
@Service
public class LiveAccountAccess {
    private final JdbcTemplate jdbc;
    public LiveAccountAccess(JdbcTemplate jdbc){this.jdbc=jdbc;}

    /** Đọc status/hash/quyền bằng một truy vấn; tài khoản khóa không thể giữ quyền từ session cũ. */
    @Transactional(readOnly=true)
    public AuthenticatedUserPrincipal load(long id) {
        var rows=jdbc.queryForList("""
            SELECT u.*,p.permission_code FROM users u
            LEFT JOIN user_roles ur ON ur.user_id=u.user_id
            LEFT JOIN roles r ON r.role_id=ur.role_id AND r.status='ACTIVE'
            LEFT JOIN role_permissions p ON p.role_id=r.role_id WHERE u.user_id=?
            """,id);
        if(rows.isEmpty())throw new UsernameNotFoundException("Tài khoản không còn tồn tại.");
        var u=rows.getFirst();
        var grants=rows.stream().map(r->(String)r.get("permission_code")).filter(Objects::nonNull).distinct()
            .map(p->new SimpleGrantedAuthority("ROLE_"+p)).toList();
        return new AuthenticatedUserPrincipal(id,(String)u.get("username"),(String)u.get("email"),
            (String)u.get("hashed_password"),(String)u.get("full_name"),
            u.get("company_id")==null?null:((Number)u.get("company_id")).longValue(),
            "ACTIVE".equals(u.get("status")),grants);
    }
}
