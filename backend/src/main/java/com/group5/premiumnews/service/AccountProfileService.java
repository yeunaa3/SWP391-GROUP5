package com.group5.premiumnews.service;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.exception.ConflictException;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.util.*;

@Service
public class AccountProfileService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    public AccountProfileService(JdbcTemplate jdbc,PasswordEncoder encoder){this.jdbc=jdbc;this.encoder=encoder;}
    public record Update(@NotBlank @Size(max=100) @Pattern(regexp="^[\\p{L}\\p{M}]+(?: [\\p{L}\\p{M}]+)*$") String fullName,
        @NotBlank @Email @Size(max=254) String email,@Size(max=15) String phoneNumber,
        @NotBlank String currentPassword,@Size(max=72) String newPassword,@Size(max=72) String confirmNewPassword) {}
    public Map<String,Object> get(AuthenticatedUserPrincipal user){
        return jdbc.queryForMap("SELECT username,full_name AS fullName,email,phone_number AS phoneNumber FROM users WHERE user_id=? AND status='ACTIVE'",user.id());
    }
    @Transactional
    public Map<String,Object> update(AuthenticatedUserPrincipal user,Update request){
        var row=jdbc.queryForMap("SELECT hashed_password FROM users WHERE user_id=? AND status='ACTIVE' FOR UPDATE",user.id());
        String hash=(String)row.get("hashed_password");
        validatePasswords(encoder,hash,request);
        String email=request.email().trim().toLowerCase(Locale.ROOT);
        Integer duplicate=jdbc.queryForObject("SELECT COUNT(*) FROM users WHERE LOWER(email)=? AND user_id<>?",Integer.class,email,user.id());
        if(duplicate!=null && duplicate>0) throw new ConflictException("Email đã được sử dụng.");
        String phone=AuthenticationService.validatePhone(request.phoneNumber());
        String newHash=request.newPassword()==null || request.newPassword().isEmpty()?hash:encoder.encode(request.newPassword());
        jdbc.update("UPDATE users SET full_name=?,email=?,phone_number=?,hashed_password=? WHERE user_id=?",request.fullName().trim(),email,phone,newHash,user.id());
        jdbc.update("INSERT INTO audit_logs(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)",user.id(),"UPDATE_PROFILE","USER",user.id().toString());
        return get(user);
    }
    static void validatePasswords(PasswordEncoder encoder,String hash,Update request){
        if(!encoder.matches(request.currentPassword(),hash)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mật khẩu hiện tại không đúng.");
        String password=request.newPassword(),confirm=request.confirmNewPassword();
        if((password==null || password.isEmpty()) && (confirm==null || confirm.isEmpty())) return;
        if(password==null || password.length()<8 || password.length()>72 || !password.equals(confirm)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mật khẩu mới cần 8–72 ký tự và xác nhận trùng khớp.");
        if(encoder.matches(password,hash)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Mật khẩu mới phải khác mật khẩu hiện tại.");
    }
}
