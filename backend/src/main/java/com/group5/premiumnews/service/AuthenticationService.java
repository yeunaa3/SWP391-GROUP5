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
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthenticatedUserResponse register(RegistrationRequest request) {
        String username = request.username().trim();
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ConflictException("Username is already in use");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email is already in use");
        }

        String roleName = request.accountType() == AccountType.BUSINESS ? "BUSINESS" : "READER";
        Role role = roleRepository.findByNameAndStatus(roleName, "ACTIVE")
                .orElseThrow(() -> new IllegalStateException("Required role is not configured: " + roleName));
        User user = new User(username, email, passwordEncoder.encode(request.password()),
                request.fullName().trim(), normalizeOptional(request.phoneNumber()));
        user.addRole(role);
        return AuthenticatedUserResponse.from(AuthenticatedUserPrincipal.from(userRepository.save(user)));
    }

    private String normalizeOptional(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
