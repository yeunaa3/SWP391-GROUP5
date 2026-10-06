package com.group5.premiumnews.repository;

import com.group5.premiumnews.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByNameAndStatus(String name, String status);
}
