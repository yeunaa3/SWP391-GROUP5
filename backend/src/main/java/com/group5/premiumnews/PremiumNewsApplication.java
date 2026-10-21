package com.group5.premiumnews;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableAsync(proxyTargetClass = true)
@EnableScheduling
@SpringBootApplication
public class PremiumNewsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PremiumNewsApplication.class, args);
    }
}
