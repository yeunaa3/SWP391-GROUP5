package com.group5.premiumnews.config;

import com.group5.premiumnews.entity.Role;
import com.group5.premiumnews.entity.User;
import com.group5.premiumnews.repository.RoleRepository;
import com.group5.premiumnews.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@Profile("local")
public class LocalDemoAccountInitializer implements CommandLineRunner {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final String demoPassword;

    public LocalDemoAccountInitializer(UserRepository users, RoleRepository roles,
            PasswordEncoder passwordEncoder,
            @Value("${app.demo.password:Demo@12345}") String demoPassword) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.demoPassword = demoPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        List<DemoAccount> accounts = List.of(
                new DemoAccount("reader.demo", "reader@thepulse.local", "Reader Demo", "READER"),
                new DemoAccount("business.demo", "business@thepulse.local", "Business Demo", "BUSINESS"),
                new DemoAccount("manager.demo", "manager@thepulse.local", "Ad Manager Demo", "AD_MANAGER"),
                new DemoAccount("admin.demo", "admin@thepulse.local", "Administrator Demo", "ADMINISTRATOR"));
        accounts.forEach(this::createIfMissing);
    }

    private void createIfMissing(DemoAccount account) {
        if (users.existsByUsernameIgnoreCase(account.username())) {
            return;
        }
        Role role = roles.findByNameAndStatus(account.role(), "ACTIVE")
                .orElseThrow(() -> new IllegalStateException("Missing seed role: " + account.role()));
        User user = new User(account.username(), account.email(), passwordEncoder.encode(demoPassword),
                account.fullName(), null);
        user.addRole(role);
        users.save(user);
    }

    private record DemoAccount(String username, String email, String fullName, String role) {
    }
}
