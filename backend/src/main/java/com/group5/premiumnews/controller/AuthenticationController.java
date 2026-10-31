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

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthenticationController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final AuthenticationService authenticationService;
    private final PasswordResetService passwordResetService;

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

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getParameterName(), token.getToken());
    }

    @PostMapping("/register")
    // UC-05: kiểm tra DTO, gọi service tạo tài khoản và trả HTTP 201. Không tạo phiên đăng nhập tại đây.
    public ResponseEntity<AuthenticatedUserResponse> register(@Valid @RequestBody RegistrationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authenticationService.register(request));
    }

    @PostMapping("/login")
    public AuthenticatedUserResponse login(@Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        // UC-06: provider đọc user từ DB và so mật khẩu; chỉ tiếp tục khi xác thực thành công.
        Authentication authentication = authenticationManager.authenticate(//giao việc xác thực cho Spring Security
                UsernamePasswordAuthenticationToken.unauthenticated(request.login(), request.password()));
        // Đổi session ID sau login để chống session fixation; không tái sử dụng identity tài khoản trước.
        if (httpRequest.getSession(false) != null) {
            httpRequest.changeSessionId();
        }
        // Lưu người đã xác thực vào context của request hiện tại và session cho request tiếp theo.---để ko query lại database 
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);
        return AuthenticatedUserResponse.from((AuthenticatedUserPrincipal) authentication.getPrincipal());
    }

    @GetMapping("/me")
    public AuthenticatedUserResponse me(Authentication authentication) {
        // Trả tài khoản từ session để frontend xác nhận đăng nhập; không truy vấn lại users tại đây.
        return AuthenticatedUserResponse.from((AuthenticatedUserPrincipal) authentication.getPrincipal());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        if (request.getSession(false) != null) {
            request.getSession(false).invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        String origin = httpRequest.getHeader("Origin");
        if (origin == null || origin.isBlank()) {
            origin = httpRequest.getHeader("Referer");
            if (origin != null && origin.contains("/")) {
                try {
                    java.net.URI uri = java.net.URI.create(origin);
                    origin = uri.getScheme() + "://" + uri.getAuthority();
                } catch (Exception ignored) {
                }
            }
        }
        passwordResetService.requestPasswordReset(request.identifier(), origin);
        return ResponseEntity.ok(Map.of("message", "Nếu tài khoản tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến email của bạn."));
    }

    @GetMapping("/verify-reset-token")
    public ResponseEntity<ResetTokenStatusResponse> verifyResetToken(@RequestParam("token") String token) {
        ResetTokenStatusResponse response = passwordResetService.verifyResetToken(token);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập bằng mật khẩu mới."));
    }
}
