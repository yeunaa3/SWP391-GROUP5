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

/**
 * =================================================================================================
 * SERVICE: PASSWORD RESET SERVICE (DỊCH VỤ QUẢN LÝ QUÊN VÀ ĐẶT LẠI MẬT KHẨU)
 * =================================================================================================
 * 
 * Nghiệp vụ: Đáp ứng ca sử dụng UC-07 (Reset Password) trong tài liệu đặc tả SRS của The Pluse.
 * 
 * Kiến trúc bảo mật tuân thủ tiêu chuẩn OWASP (Open Web Application Security Project):
 * 1. Token ngẫu nhiên bảo mật cao:
 *    - Sử dụng SecureRandom sinh 32 bytes ngẫu nhiên (256-bit entropy).
 *    - Mã hóa sang chuỗi 64 ký tự Hex (HexFormat) để tạo đường dẫn gửi qua email người dùng.
 * 
 * 2. Lưu trữ bảo mật (One-way Hash):
 *    - Tuyệt đối không lưu token nguyên bản vào cơ sở dữ liệu.
 *    - Token được băm bằng thuật toán SHA-256 tạo chuỗi băm 64 ký tự lưu tại cột `token_hash`
 *      trong bảng `password_reset_tokens`.
 *    - Nhờ đó, ngay cả khi cơ sở dữ liệu bị lộ, kẻ tấn công cũng không thể tạo liên kết đổi mật khẩu.
 * 
 * 3. Ràng buộc thời hạn và số lần sử dụng:
 *    - Token chỉ có hiệu lực trong vòng 15 phút (TOKEN_EXPIRY_MINUTES = 15).
 *    - Chỉ được sử dụng duy nhất một lần (sau khi đổi mật khẩu thành công, ghi nhận used_at = now).
 *    - Khi có yêu cầu mới từ cùng một tài khoản, tất cả token đang mở trước đó lập tức bị vô hiệu hóa.
 * 
 * 4. Chống thu thập tài khoản (Account Enumeration Defense):
 *    - Nếu username hoặc email không tồn tại trong hệ thống, hàm xử lý êm dịu (silent exit),
 *      API vẫn trả về thông điệp thành công chung chung để kẻ gian không thể dò quét tài khoản hợp lệ.
 * 
 * 5. Mã hóa mật khẩu mới:
 *    - Mật khẩu mới được băm bằng BCryptPasswordEncoder trước khi cập nhật vào bảng `users`.
 * =================================================================================================
 */
@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);

    /** Thời hạn hiệu lực của mã token đặt lại mật khẩu: 15 phút */
    private static final int TOKEN_EXPIRY_MINUTES = 15;

    /** Bộ sinh số ngẫu nhiên chuẩn mật mã học an toàn */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final String defaultFrontendUrl;

    /**
     * Khởi tạo PasswordResetService với các dependency cần thiết.
     * 
     * @param userRepository            Repository thao tác bảng users
     * @param tokenRepository           Repository thao tác bảng password_reset_tokens
     * @param emailService              Dịch vụ gửi email thông báo hệ thống
     * @param passwordEncoder           Bộ mã hóa mật khẩu chuẩn BCrypt
     * @param defaultFrontendUrl        URL gốc của giao diện người dùng (ví dụ: http://localhost:5173)
     */
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

    /**
     * =============================================================================================
     * BƯỚC 1 TRONG LUỒNG QUÊN MẬT KHẨU: TIẾP NHẬN YÊU CẦU & GỬI EMAIL CHỨA LIÊN KẾT XÁC THỰC
     * =============================================================================================
     * 
     * @param identifier    Tên đăng nhập (username) hoặc địa chỉ email của tài khoản cần lấy lại mật khẩu
     * @param originHeader  Header Origin hoặc Referer từ HTTP request để tạo link chuẩn domain người dùng truy cập
     * @throws ResponseStatusException (503 SERVICE_UNAVAILABLE) nếu máy chủ SMTP gặp sự cố không thể gửi thư
     */
    @Transactional
    public void requestPasswordReset(String identifier, String originHeader) {
        // Kiểm tra tính hợp lệ của tham số đầu vào
        if (identifier == null || identifier.isBlank()) {
            return;
        }

        String trimmed = identifier.trim();

        // 1. Tìm kiếm người dùng theo username HOẶC email (không phân biệt chữ hoa/thường)
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(trimmed, trimmed);
        if (userOpt.isEmpty()) {
            // OWASP Security: Không tiết lộ tài khoản tồn tại hay không ra bên ngoài
            log.warn("[PasswordReset] Yêu cầu đặt lại mật khẩu: Không tìm thấy tài khoản với tên đăng nhập hoặc email '{}'", trimmed);
            return;
        }

        User user = userOpt.get();
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            log.warn("[PasswordReset] Người dùng '{}' không có email hợp lệ trong hệ thống để nhận thư", user.getUsername());
            return;
        }

        // 2. Vô hiệu hóa toàn bộ các mã token còn hiệu lực trước đó của tài khoản này
        tokenRepository.invalidateActiveTokensForUser(user.getId(), Instant.now());

        // 3. Sinh token ngẫu nhiên bảo mật 32 bytes (chuỗi 64 ký tự Hex)
        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);
        String rawToken = HexFormat.of().formatHex(randomBytes);

        // 4. Băm token bằng thuật toán SHA-256 để lưu trữ an toàn trong MySQL
        String tokenHash = hashToken(rawToken);

        // 5. Thiết lập thời gian hết hạn là 15 phút tính từ thời điểm hiện tại
        Instant expiresAt = Instant.now().plus(Duration.ofMinutes(TOKEN_EXPIRY_MINUTES));

        // 6. Lưu thực thể PasswordResetToken mới vào bảng `password_reset_tokens`
        PasswordResetToken resetToken = new PasswordResetToken(user, tokenHash, expiresAt);
        tokenRepository.save(resetToken);

        // 7. Xây dựng đường dẫn đặt lại mật khẩu gửi qua email
        String baseUrl = (originHeader != null && !originHeader.isBlank()) ? originHeader.trim() : defaultFrontendUrl;
        if (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        String resetUrl = baseUrl + "/reset-password?token=" + rawToken;

        // 8. Tiến hành gửi email bảo mật chứa liên kết dùng 1 lần
        String displayName = (user.getFullName() != null && !user.getFullName().isBlank()) ? user.getFullName() : user.getUsername();
        String emailStatus = emailService.sendPasswordResetEmail(user.getEmail(), displayName, resetUrl, TOKEN_EXPIRY_MINUTES);

        log.info("[PasswordReset] Đã xử lý yêu cầu đặt lại mật khẩu cho user '{}' (email: {}, emailStatus: {}).",
                user.getUsername(), user.getEmail(), emailStatus);

        // Nếu việc gửi email thất bại do lỗi kết nối máy chủ mail, báo lỗi cụ thể
        if (emailStatus != null && emailStatus.startsWith("FAILED")) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Không thể gửi email lúc này do máy chủ gửi thư gặp sự cố kết nối. Vui lòng thử lại sau hoặc liên hệ quản trị viên.");
        }
    }

    /**
     * =============================================================================================
     * BƯỚC 2 TRONG LUỒNG QUÊN MẬT KHẨU: XÁC THỰC MÃ TOKEN TRÊN ĐƯỜNG DẪN KHI NGƯỜI DÙNG MỞ TRANG
     * =============================================================================================
     * 
     * Hàm này được gọi tự động khi trang `/reset-password?token=...` được tải để kiểm tra tính hợp lệ
     * của token trước khi người dùng nhập mật khẩu mới.
     * 
     * @param rawToken  Mã token nguyên bản trích xuất từ query param của URL
     * @return ResetTokenStatusResponse chứa trạng thái hợp lệ, email đã che (mask) và thông điệp hướng dẫn
     */
    @Transactional(readOnly = true)
    public ResetTokenStatusResponse verifyResetToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết không hợp lệ.");
        }

        // Băm mã token nhận được từ client để tìm kiếm trong cơ sở dữ liệu
        String tokenHash = hashToken(rawToken.trim());
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findByTokenHash(tokenHash);

        if (tokenOpt.isEmpty()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết không tồn tại hoặc đã hết hiệu lực.");
        }

        PasswordResetToken token = tokenOpt.get();

        // Kiểm tra xem token này đã từng được sử dụng để đổi mật khẩu trước đó chưa
        if (token.isUsed()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết này đã được sử dụng. Vui lòng yêu cầu mã mới.");
        }

        // Kiểm tra xem token đã quá thời hạn 15 phút chưa
        if (token.isExpired()) {
            return new ResetTokenStatusResponse(false, null, "Mã liên kết đã hết hạn (chỉ có hiệu lực trong 15 phút). Vui lòng yêu cầu mã mới.");
        }

        // Che chắn địa chỉ email hiển thị trên giao diện (ví dụ: d***g@gmail.com) để bảo mật thông tin
        String maskedEmail = maskEmail(token.getUser().getEmail());
        return new ResetTokenStatusResponse(true, maskedEmail, "Mã liên kết hợp lệ.");
    }

    /**
     * =============================================================================================
     * BƯỚC 3 TRONG LUỒNG QUÊN MẬT KHẨU: CẬP NHẬT MẬT KHẨU MỚI VÀO DATABASE
     * =============================================================================================
     * 
     * @param rawToken     Mã token bí mật từ email
     * @param newPassword  Mật khẩu mới người dùng vừa nhập (đáp ứng từ 8 đến 64 ký tự)
     * @throws ResponseStatusException nếu token không hợp lệ, đã dùng, hết hạn, hoặc mật khẩu vi phạm quy tắc
     */
    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        // Kiểm tra token đầu vào
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết không hợp lệ.");
        }

        // Kiểm tra độ dài mật khẩu mới (theo tiêu chuẩn SRS)
        if (newPassword == null || newPassword.length() < 8 || newPassword.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải từ 8 đến 64 ký tự.");
        }

        // Tìm token trong database
        String tokenHash = hashToken(rawToken.trim());
        PasswordResetToken token = tokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết không tồn tại hoặc không hợp lệ."));

        // Kiểm tra trạng thái đã dùng
        if (token.isUsed()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết này đã được sử dụng trước đó.");
        }

        // Kiểm tra thời hạn
        if (token.isExpired()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã liên kết đã hết hạn. Vui lòng yêu cầu mã mới.");
        }

        // 1. Cập nhật mật khẩu mới đã băm bằng BCrypt vào bảng users
        User user = token.getUser();
        user.setHashedPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // 2. Đánh dấu token đã được sử dụng (ghi nhận thời điểm used_at)
        token.markUsed();
        tokenRepository.save(token);

        log.info("[PasswordReset] Đặt lại mật khẩu thành công cho tài khoản '{}'", user.getUsername());
    }

    /**
     * Băm chuỗi văn bản bằng thuật toán tiêu chuẩn SHA-256 (tạo chuỗi Hex 64 ký tự).
     * 
     * @param rawToken Chuỗi token nguyên bản
     * @return Chuỗi băm 64 ký tự Hex
     */
    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Thuật toán SHA-256 không khả dụng trên hệ thống", e);
        }
    }

    /**
     * Che bớt ký tự của địa chỉ email để bảo mật thông tin hiển thị trên giao diện người dùng.
     * Ví dụ: batman582006@gmail.com -> b***6@gmail.com
     * 
     * @param email Địa chỉ email đầy đủ
     * @return Địa chỉ email đã được che giấu một phần
     */
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
