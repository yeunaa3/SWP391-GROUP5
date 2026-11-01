package com.group5.premiumnews.controller;

import com.group5.premiumnews.dto.auth.AuthenticatedUserResponse;
import com.group5.premiumnews.dto.auth.CsrfResponse;
import com.group5.premiumnews.dto.auth.ForgotPasswordRequest;
import com.group5.premiumnews.dto.auth.LoginRequest;
import com.group5.premiumnews.dto.auth.RegistrationRequest;
import com.group5.premiumnews.dto.auth.ResetPasswordRequest;
import com.group5.premiumnews.dto.auth.ResetTokenStatusResponse;
import com.group5.premiumnews.security.AuthenticatedUserPrincipal;
import com.group5.premiumnews.service.AuthenticationService;
import com.group5.premiumnews.service.PasswordResetService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

/**
 * =================================================================================================
 * CONTROLLER: AUTHENTICATION CONTROLLER (ĐIỀU HƯỚNG XÁC THỰC & BẢO MẬT TÀI KHOẢN)
 * =================================================================================================
 * 
 * Quản lý toàn bộ các điểm cuối API liên quan đến danh tính và bảo mật:
 * 1. Lấy mã bảo mật CSRF Token (`GET /api/auth/csrf`)
 * 2. Đăng ký tài khoản Độc giả / Doanh nghiệp (`POST /api/auth/register` - UC-05)
 * 3. Đăng nhập hệ thống & tạo phiên làm việc bảo mật (`POST /api/auth/login` - UC-06)
 * 4. Kiểm tra phiên đăng nhập hiện tại (`GET /api/auth/me`)
 * 5. Đăng xuất & hủy phiên làm việc (`POST /api/auth/logout` - UC-09)
 * 6. Yêu cầu khôi phục mật khẩu qua Email (`POST /api/auth/forgot-password` - UC-07)
 * 7. Kiểm tra tính hợp lệ của Token đặt lại mật khẩu (`GET /api/auth/verify-reset-token` - UC-07)
 * 8. Đặt lại mật khẩu mới (`POST /api/auth/reset-password` - UC-07)
 * =================================================================================================
 */
@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final AuthenticationService authenticationService;
    private final PasswordResetService passwordResetService;

    /**
     * Khởi tạo AuthenticationController với các Service và Security Manager của Spring.
     */
    public AuthenticationController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            AuthenticationService authenticationService,
            PasswordResetService passwordResetService) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.authenticationService = authenticationService;
        this.passwordResetService = passwordResetService;
    }

    /**
     * [API-CSRF] Cung cấp CSRF token cho Frontend để bảo vệ các thao tác POST/PUT/DELETE.
     */
    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    /**
     * [API-REGISTER] Đăng ký tài khoản người dùng mới (UC-05).
     * 
     * @param request Thông tin đăng ký bao gồm username, email, mật khẩu, họ tên, số điện thoại
     * @return Thông tin tài khoản vừa tạo kèm HTTP Status 201 Created
     */
    @PostMapping("/register")
    public ResponseEntity<AuthenticatedUserResponse> register(@Valid @RequestBody RegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authenticationService.register(request));
    }

    /**
     * [API-LOGIN] Đăng nhập hệ thống (UC-06).
     * 
     * Cơ chế:
     * - Xác thực username/email và mật khẩu qua Spring Security AuthenticationManager.
     * - Đổi Session ID sau khi đăng nhập thành công để chống tấn công cố định phiên (Session Fixation).
     * - Lưu thông tin định danh vào SecurityContext để các request tiếp theo tự động nhận biết.
     */
    @PostMapping("/login")
    public AuthenticatedUserResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        // Giao việc xác thực thông tin đăng nhập cho DaoAuthenticationProvider (BCrypt)
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.login(), request.password()));

        // Chống tấn công Session Fixation: Thay đổi session ID sau khi đăng nhập thành công
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }

        // Lưu thông tin người dùng đã xác thực vào context của phiên làm việc
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        return AuthenticatedUserResponse.from((AuthenticatedUserPrincipal) authentication.getPrincipal());
    }

    /**
     * [API-ME] Lấy thông tin tài khoản đang đăng nhập từ Session hiện tại.
     */
    @GetMapping("/me")
    public AuthenticatedUserResponse me(Authentication authentication) {
        return AuthenticatedUserResponse.from((AuthenticatedUserPrincipal) authentication.getPrincipal());
    }

    /**
     * [API-LOGOUT] Đăng xuất tài khoản (UC-09).
     * 
     * Hủy bỏ HTTP session và xóa sạch dữ liệu khỏi SecurityContextHolder.
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    /**
     * [API-FORGOT-PASSWORD] Tiếp nhận yêu cầu quên mật khẩu và kích hoạt gửi email (UC-07).
     * 
     * Quy trình:
     * - Trích xuất tên miền nguồn (Origin/Referer) để tạo đường dẫn reset tương ứng với môi trường client.
     * - Gọi PasswordResetService để sinh token bí mật 32-byte, lưu băm SHA-256 vào database và gửi email.
     * - Trả về thông báo trung tính tuân thủ tiêu chuẩn bảo mật OWASP.
     * 
     * @param request      DTO chứa trường `identifier` (tên đăng nhập hoặc email)
     * @param httpRequest  Đối tượng HTTP Request để đọc header Origin/Referer
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        // Trích xuất domain của client gửi yêu cầu (hỗ trợ cả localhost lẫn domain production)
        String origin = resolveClientOrigin(httpRequest);

        passwordResetService.requestPasswordReset(request.identifier(), origin);

        return ResponseEntity.ok(Map.of(
                "message", "Nếu thông tin khớp với tài khoản trên hệ thống The Pluse, hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn."
        ));
    }

    /**
     * [API-VERIFY-RESET-TOKEN] Xác thực tính hợp lệ của Token khi người dùng mở liên kết từ Email (UC-07).
     * 
     * Được gọi tự động khi trang `/reset-password?token=...` được tải để:
     * - Kiểm tra token có tồn tại không.
     * - Kiểm tra token đã bị sử dụng chưa (`used_at IS NULL`).
     * - Kiểm tra token còn trong thời hạn 15 phút không.
     * - Trả về email đã che giấu (ví dụ: b***6@gmail.com) để người dùng yên tâm tiếp tục.
     * 
     * @param token Mã token nguyên bản từ query param
     */
    @GetMapping("/verify-reset-token")
    public ResponseEntity<ResetTokenStatusResponse> verifyResetToken(@RequestParam("token") String token) {
        ResetTokenStatusResponse response = passwordResetService.verifyResetToken(token);
        return ResponseEntity.ok(response);
    }

    /**
     * [API-RESET-PASSWORD] Đặt lại mật khẩu mới cho tài khoản (UC-07).
     * 
     * Quy trình:
     * - Xác thực lại token lần cuối (chống can thiệp hoặc token hết hạn giữa chừng).
     * - Kiểm tra độ dài mật khẩu mới (từ 8 đến 64 ký tự).
     * - Băm mật khẩu mới bằng BCrypt và lưu vào bảng `users`.
     * - Đánh dấu token đã được sử dụng để ngăn chặn việc sử dụng lại.
     * 
     * @param request DTO chứa mã token và mật khẩu mới
     */
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of(
                "message", "Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới."
        ));
    }

    /**
     * Hàm phụ trợ phân giải domain nguồn của client từ request headers (Origin hoặc Referer).
     */
    private String resolveClientOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank()) {
            return origin.trim();
        }

        String referer = request.getHeader("Referer");
        if (referer != null && referer.contains("/")) {
            try {
                URI uri = URI.create(referer);
                return uri.getScheme() + "://" + uri.getAuthority();
            } catch (Exception ignored) {
            }
        }
        return null;
    }
}
