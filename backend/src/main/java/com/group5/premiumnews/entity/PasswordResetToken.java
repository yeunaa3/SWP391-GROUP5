package com.group5.premiumnews.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * =================================================================================================
 * ENTITY: PASSWORD RESET TOKEN (THỰC THỂ MÃ TOKEN ĐẶT LẠI MẬT KHẨU)
 * =================================================================================================
 * 
 * Bảng cơ sở dữ liệu: `password_reset_tokens` (MySQL).
 * 
 * Mục đích nghiệp vụ:
 * - Lưu trữ chuỗi băm (SHA-256 hash) của mã xác thực đổi mật khẩu theo ca sử dụng UC-07.
 * - Đảm bảo nguyên tắc bảo mật OWASP:
 *   + Không lưu token thô để tránh nguy cơ rò rỉ khi database bị tấn công.
 *   + Quản lý thời hạn sống của token (`expires_at`, 15 phút).
 *   + Quản lý trạng thái đã sử dụng (`used_at`, ngăn chặn việc tái sử dụng token).
 *   + Khóa ngoại liên kết tới bảng `users(user_id)` với hành vi ON DELETE CASCADE.
 * =================================================================================================
 */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {

    /** Khóa chính tự tăng (BIGINT AUTO_INCREMENT) */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "token_id")
    private Long id;

    /** Người dùng sở hữu mã token này (Quan hệ nhiều-một với bảng users) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Chuỗi băm SHA-256 (64 ký tự Hex) của mã token bí mật */
    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;

    /** Thời điểm token hết hạn sử dụng (15 phút sau khi tạo) */
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Thời điểm token được sử dụng (NULL nếu chưa dùng) */
    @Column(name = "used_at")
    private Instant usedAt;

    /** Thời điểm tạo bản ghi (Tự động tạo bởi MySQL) */
    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    /** Constructor mặc định được yêu cầu bởi JPA */
    protected PasswordResetToken() {
    }

    /**
     * Constructor khởi tạo mã token mới cho người dùng.
     * 
     * @param user       Thực thể User yêu cầu đổi mật khẩu
     * @param tokenHash  Chuỗi băm SHA-256 (64 ký tự)
     * @param expiresAt  Thời điểm hết hạn
     */
    public PasswordResetToken(User user, String tokenHash, Instant expiresAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public Long getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    /**
     * Kiểm tra xem mã token đã quá hạn sử dụng hay chưa.
     * 
     * @return true nếu đã quá thời điểm expiresAt
     */
    public boolean isExpired() {
        return expiresAt == null || Instant.now().isAfter(expiresAt);
    }

    /**
     * Kiểm tra xem mã token đã được người dùng sử dụng để đổi mật khẩu thành công chưa.
     * 
     * @return true nếu trường usedAt khác null
     */
    public boolean isUsed() {
        return usedAt != null;
    }

    /**
     * Đánh dấu token đã được sử dụng thành công (gán thời điểm hiện tại vào usedAt).
     */
    public void markUsed() {
        this.usedAt = Instant.now();
    }
}
