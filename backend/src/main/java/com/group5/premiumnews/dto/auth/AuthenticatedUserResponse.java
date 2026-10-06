package com.group5.premiumnews.dto.auth;

import com.group5.premiumnews.security.AuthenticatedUserPrincipal;

import java.util.Set;
import java.util.stream.Collectors;

public record AuthenticatedUserResponse(
        Long id, String username, String email, String fullName, Long companyId, Set<String> roles) {

    public static AuthenticatedUserResponse from(AuthenticatedUserPrincipal principal) {
        Set<String> roles = principal.authorities().stream()
                .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
                .collect(Collectors.toUnmodifiableSet());
        return new AuthenticatedUserResponse(
                principal.id(), principal.username(), principal.email(), principal.fullName(), principal.companyId(), roles);
    }
}
