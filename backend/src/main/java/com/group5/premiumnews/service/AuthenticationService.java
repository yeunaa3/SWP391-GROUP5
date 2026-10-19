package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.auth.AccountType;
import com.group5.premiumnews.dto.auth.AuthenticatedUserResponse;
import com.group5.premiumnews.dto.auth.RegistrationRequest;
import com.group5.premiumnews.entity.Role;
import com.group5.premiumnews.entity.User;
import com.group5.premiumnews.exception.ConflictException;
import com.group5.premiumnews.repository.RoleRepository;
import com.group5.premiumnews.repository.UserRepository;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthenticationService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthenticationService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        // Spring truyền các dependency: truy cập users/roles và bộ băm mật khẩu.
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    // UC-05: tạo user và liên kết role trong một transaction; lỗi giữa chừng sẽ rollback.
    public AuthenticatedUserResponse register(RegistrationRequest request) {
        if(!Boolean.TRUE.equals(request.acceptedTerms()) || !request.isPasswordConfirmed())
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                "Cần đồng ý điều khoản và nhập mật khẩu xác nhận trùng khớp.");
        String phone = validatePhone(request.phoneNumber());
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        boolean usernameTaken=userRepository.existsByUsernameIgnoreCase(username);
        
        // Kiểm tra duy nhất trên toàn bộ tài khoản, không chia riêng Reader và Business.
        
        boolean emailTaken=userRepository.existsByEmailIgnoreCase(email);
        if(usernameTaken || emailTaken) {
            String message=(usernameTaken?"Username đã được sử dụng. Vui lòng đặt username khác.":"")
                +(usernameTaken && emailTaken?" ":"")
                +(emailTaken?"Email đã được sử dụng. Vui lòng sử dụng email khác.":"");
            throw new ConflictException(message);
        }

        String roleName = request.accountType() == AccountType.BUSINESS ? "BUSINESS" : "READER";
        // Chỉ lấy role mặc định đang ACTIVE; người đăng ký không được tự chọn quyền quản trị.
        Role role = roleRepository.findByNameAndStatus(roleName, "ACTIVE")
                .orElseThrow(() -> new IllegalStateException("Required role is not configured: " + roleName));
        User user = new User(username, email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), phone);
        user.addRole(role);
        // Lưu mật khẩu đã băm và role; response chỉ chứa thông tin công khai, không trả mật khẩu.
        return AuthenticatedUserResponse.from(AuthenticatedUserPrincipal.from(userRepository.save(user)));
    }

    private String normalizeOptional(String value) {
        // Hàm tiện ích cũ; luồng register hiện tại không gọi hàm này.
        return value == null || value.isBlank() ? null : value.trim();
    }
    static String validatePhone(String value) {
        // Số tùy chọn có 8–15 chữ số. Đầu 0 dùng vùng VN; mã quốc gia khác do libphonenumber kiểm tra
        // độ dài/đầu số thực tế, sau đó chuẩn hóa E.164 để DB không lưu nhiều dạng khác nhau.
        if(value==null || value.isEmpty()) return null;
        try {
            if(!value.matches("[0-9]{8,15}")) throw new IllegalArgumentException();
            var util=com.google.i18n.phonenumbers.PhoneNumberUtil.getInstance();
            var number=util.parse(value.startsWith("0")?value:"+"+value,"VN");
            if(!util.isValidNumber(number)) throw new IllegalArgumentException();
            return util.format(number,com.google.i18n.phonenumbers.PhoneNumberUtil.PhoneNumberFormat.E164);
        } catch(Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                "Số điện thoại không hợp lệ theo đầu số quốc gia. Dùng 0 cho Việt Nam hoặc mã quốc gia (84, 1, 44…).");
        }
    }
}
