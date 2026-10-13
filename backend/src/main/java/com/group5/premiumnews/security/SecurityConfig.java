package com.group5.premiumnews.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            DaoAuthenticationProvider authenticationProvider,
            SecurityContextRepository securityContextRepository) throws Exception {
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setCookiePath("/");

        return http
                .cors(cors -> { })
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        .ignoringRequestMatchers("/api/payments/webhooks/**"))
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authenticationProvider(authenticationProvider)
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers("/api/health", "/actuator/health", "/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/csrf", "/api/articles/**",
                                "/api/subscription-packages/**", "/api/advertising/offers", "/api/advertising/slots", "/api/advertising/banners", "/api/media/creative/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register", "/api/payments/webhooks/**").permitAll()
                        // Public HTML shell/assets only. Data stays behind /api authorization above/below.
                        .requestMatchers(HttpMethod.GET, "/", "/index.html", "/assets/**", "/ads/**",
                                "/favicon.ico", "/news", "/search", "/login", "/register", "/forgot-password", "/reset-password",
                                "/articles/**", "/premium/**", "/account/**", "/business", "/business/**",
                                "/ad-manager", "/ad-manager/**", "/admin", "/admin/**", "/advertising-demo").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .build();
    }

    @Bean
    DaoAuthenticationProvider authenticationProvider(
            DatabaseUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        // UC-06: nối service đọc DB với BCrypt để xác thực mật khẩu và trạng thái UserDetails. nạp tk vào để xác thực
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return provider;
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {// cung cấp manager mà controller gọi
        // Controller dùng manager này để giao yêu cầu xác thực cho provider đã cấu hình.
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        // Giữ SecurityContext trong HTTP session để các API sau nhận biết người đã đăng nhập.
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        // BCrypt dùng encode khi đăng ký và matches khi xác thực; không giải mã hash mật khẩu.
        return new BCryptPasswordEncoder();
    }
}
