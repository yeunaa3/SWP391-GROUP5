package com.group5.premiumnews.config;

import com.group5.premiumnews.entity.User;
import com.group5.premiumnews.repository.RoleRepository;
import com.group5.premiumnews.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Explicitly enabled test accounts only; never use the public local demo password. */
@Component
@Order(100)
@Profile("render")
@ConditionalOnProperty(name = "app.render-demo.enabled", havingValue = "true")
public class RenderDemoAccountInitializer implements CommandLineRunner {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;
    private final String password;

    public RenderDemoAccountInitializer(UserRepository users, RoleRepository roles,
            PasswordEncoder encoder, JdbcTemplate jdbc,
            @Value("${RENDER_DEMO_PASSWORD:}") String password) {
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.jdbc = jdbc;
        this.password = password;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (password.length() < 16 || password.equals("Demo@12345")) {
            throw new IllegalStateException("Set a private RENDER_DEMO_PASSWORD of at least 16 characters before enabling demo accounts");
        }
        create("reader.demo", "READER");
        create("premium.demo", "SUBSCRIBER");
        create("business.demo", "BUSINESS");
        create("business.new.demo", "BUSINESS");
        create("business.pending.demo", "BUSINESS");
        create("business.revision.demo", "BUSINESS");
        create("business.rejected.demo", "BUSINESS");
        create("manager.demo", "AD_MANAGER");
        create("admin.demo", "ADMINISTRATOR");
    }

    private void create(String username, String role) {
        // Do not reset passwords, elevate existing users, or renew entitlements on restart.
        if (users.existsByUsernameIgnoreCase(username)) return;
        User user = new User(username, username + "@thepluse.example",
                encoder.encode(password), "The Pluse Test - " + role, null);
        user.addRole(roles.findByNameAndStatus(role, "ACTIVE").orElseThrow());
        if (role.equals("SUBSCRIBER")) {
            user.addRole(roles.findByNameAndStatus("READER", "ACTIVE").orElseThrow());
        }
        users.saveAndFlush(user);
        if (role.equals("SUBSCRIBER")) {
            jdbc.update("""
                INSERT INTO subscriptions(user_id,package_id,package_code_snapshot,
                    package_name_snapshot,price_snapshot,currency,duration_days_snapshot,
                    start_at,end_at,status)
                SELECT ?,package_id,code,CONCAT('TEST - ',name),0,currency,30,
                    CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL 30 DAY,'ACTIVE'
                FROM subscription_packages WHERE status='ACTIVE'
                ORDER BY package_id LIMIT 1
                """, user.getId());
        }
    }
}
