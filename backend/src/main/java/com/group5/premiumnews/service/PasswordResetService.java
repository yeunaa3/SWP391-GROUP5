package com.group5.premiumnews.service;

import com.group5.premiumnews.dto.auth.ResetTokenStatusResponse;
import com.group5.premiumnews.entity.PasswordResetToken;
import com.group5.premiumnews.entity.User;
import com.group5.premiumnews.integration.email.EmailService;
import com.group5.premiumnews.repository.PasswordResetTokenRepository;
import com.group5.premiumnews.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TOKEN_EXPIRY_MINUTES = 15;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final String defaultFrontendUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder,
            @Value("${app.frontend.url:${app.cors.allowed-origins:http://localhost:5173}}") String defaultFrontendUrl) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
        this.defaultFrontendUrl = defaultFrontendUrl.split(",")[0].trim();
    }

    @Transactional
    public void requestPasswordReset(String identifier, String originHeader) {
        if (identifier == null || identifier.isBlank()) {
            return;
        }

        String trimmed = identifier.trim();
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(trimmed, trimmed);
        if (userOpt.isEmpty()) {
            // OWASP mitigation: tránh brute force dò tìm username/email
            log.info("[PasswordReset] Yêu cầu đặt lại mật khẩu cho tài khoản không tồn tại: '{}'", trimmed);
            return;
        }

        User user = userOpt.get();
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("[PasswordReset] Người dùng '{}' không có email hợp lệ để nhận liên kết", user.getUsername());
            return;
        }

        // Vô hiệu hóa các mã token chưa dùng trước đó của tài khoản này
        tokenRepository.invalidateActiveTokensForUser(user.getId());

        // Sinh token ngẫu nhiên bảo mật 32 bytes (64 ký tự hex)
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = HexFormat.of().formatHex(randomBytes);
        String tokenHash = hashToken(rawToken);

        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(TOKEN_EXPIRY_MINUTES));
        PasswordResetToken resetToken = new PasswordResetToken(user, tokenHash, expiresAt);
        tokenRepository.save(resetToken);

        // Xác định URL frontend thích hợp
        String baseUrl = (originHeader != null && !originHeader.isBlank()) ? originHeader.trim() : defaultFrontendUrl;
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String resetUrl = baseUrl + "/reset-password?token=" + rawToken;

        String displayName = (user.getFullName() != null && !user.getFullName().isBlank()) ? user.getFullName() : user.getUsername();
        emailService.sendPasswordResetEmail(user.getEmail(), displayName, resetUrl, TOKEN_EXPIRY_MINUTES);

        log.info("[PasswordReset] Đã tạo mã đặt lại mật khẩu cho user '{}' (email: {}). Link: {}", user.getUsername(), user.getEmail(), resetUrl);
    }

    @Transactional(readOnly = true)
    public ResetTokenStatusResponse verifyResetToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết không hợp lệ.");
        }

        String tokenHash = hashToken(rawToken.trim());
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết không tồn tại hoặc đã hết hiệu lực.");
        }

        PasswordResetToken token = tokenOpt.get();
        if (token.isUsed()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết này đã được sử dụng. Vui lòng yêu cầu mã mới.");
        }

        if (token.isExpired()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới.");
        }

        String maskedEmail = maskEmail(token.getUser().getEmail());
        return new ResetTokenStatusResponse(true, maskedEmail, "Mã liên kết hợp lệ.");
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết không hợp lệ.");
        }
        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải từ 8 đến 64 ký tự.");
        }

        String tokenHash = hashToken(rawToken.trim());
        PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết không tồn tại hoặc không hợp lệ."));

        if (token.isUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết này đã được sử dụng trước đó.");
        }

        if (token.isExpired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết đã hết hạn. Vui lòng yêu cầu mã mới.");
        }

        User user = token.getUser();
        user.setHashedPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.markUsed();
        tokenRepository.save(token);

        log.info("[PasswordReset] Đặt lại mật khẩu thành công cho tài khoản '{}'", user.getUsername());
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Thuật toán SHA-256 không khả dụng trên hệ thống", e);
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "***";
        }
        int atIndex = email.indexOf('@');
        String namePart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex);
        if (namePart.length() <= 2) {
            return namePart.charAt(0) + "***" + domainPart;
        }
        return namePart.charAt(0) + "***" + namePart.charAt(namePart.length() - 1) + domainPart;
    }
}
