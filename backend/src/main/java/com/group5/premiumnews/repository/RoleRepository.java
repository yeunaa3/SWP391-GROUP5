package com.group5.premiumnews.repository;

import com.group5.premiumnews.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    // UC-05: lấy role mặc định theo tên và trạng thái; Optional rỗng nếu role chưa được cấu hình.
    Optional<Role> findByNameAndStatus(String name, String status);
}
