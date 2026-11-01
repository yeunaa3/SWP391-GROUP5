package com.group5.premiumnews.repository;

import com.group5.premiumnews.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

/**
 * =================================================================================================
 * REPOSITORY: PASSWORD RESET TOKEN REPOSITORY (TRUY XUẤT CƠ SỞ DỮ LIỆU TOKEN ĐẶT LẠI MẬT KHẨU)
 * =================================================================================================
 * 
 * Quản lý các thao tác CRUD và truy vấn tối ưu trên bảng `password_reset_tokens`.
 * =================================================================================================
 */
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Tìm kiếm bản ghi token bằng chuỗi băm SHA-256 (64 ký tự).
     * Được tối ưu hóa bằng chỉ mục UNIQUE INDEX `uq_password_reset_hash` trên cột `token_hash`.
     * 
     * @param tokenHash Chuỗi băm SHA-256 của token
     * @return Optional chứa PasswordResetToken nếu tồn tại
     */
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    /**
     * Vô hiệu hóa toàn bộ các mã token đang mở (chưa sử dụng, used_at IS NULL) của một người dùng.
     * Sử dụng câu lệnh JPQL UPDATE trực tiếp để đạt hiệu năng cao và tránh race conditions.
     * 
     * @param userId ID của người dùng trong bảng users
     * @param now    Thời điểm hiện tại để gán vào cột used_at
     */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = :now WHERE t.user.id = :userId AND t.usedAt IS NULL")
    void invalidateActiveTokensForUser(@Param("userId") Long userId, @Param("now") Instant now);
}
