package com.group5.premiumnews.repository;

import com.group5.premiumnews.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsernameIgnoreCaseOrEmailIgnoreCase(String username, String email);
    // UC-05: Spring Data sinh truy vấn kiểm tra username tồn tại, không phân biệt hoa/thường.
    boolean existsByUsernameIgnoreCase(String username);
    // UC-05: kiểm tra email trên toàn bảng users, gồm cả Reader và Business.
    boolean existsByEmailIgnoreCase(String email);
}
