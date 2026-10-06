package com.group5.premiumnews.security;

import com.group5.premiumnews.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public record AuthenticatedUserPrincipal(
        Long id,
        String username,
        String email,
        String password,
        String fullName,
        Long companyId,
        boolean enabled,
        Collection<? extends GrantedAuthority> authorities) implements UserDetails {

    public static AuthenticatedUserPrincipal from(User user) {
        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .filter(role -> "ACTIVE".equals(role.getStatus()))
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getName()))
                .toList();
        return new AuthenticatedUserPrincipal(
                user.getId(), user.getUsername(), user.getEmail(), user.getHashedPassword(),
                user.getFullName(), user.getCompanyId(),
                user.getStatus() == com.group5.premiumnews.entity.enums.UserStatus.ACTIVE, authorities);
    }

    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return username; }
    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return enabled; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return enabled; }
}
