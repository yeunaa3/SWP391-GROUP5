package com.group5.premiumnews.config;

import javax.sql.DataSource;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Opt-in fixtures, deliberately separate from Flyway and normal production startup. */
@Component
@Profile("render")
@Order(110)
@ConditionalOnProperty(name = "app.render-demo.enabled", havingValue = "true")
public class RenderDemoBusinessInitializer implements CommandLineRunner {
    private final DataSource dataSource;

    public RenderDemoBusinessInitializer(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    @Transactional
    public void run(String... args) {
        new ResourceDatabasePopulator(new ClassPathResource("demo/render-business.sql"))
                .execute(dataSource);
    }
}
