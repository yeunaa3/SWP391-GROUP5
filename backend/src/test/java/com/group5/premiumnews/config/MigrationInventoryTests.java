package com.group5.premiumnews.config;

import java.nio.file.*;
import java.util.HashSet;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MigrationInventoryTests {
    @Test void packagedMigrationVersionsAreUnique() throws Exception {
        var resource = getClass().getClassLoader().getResource("db/migration");
        assertNotNull(resource);
        try (var paths = Files.list(Path.of(resource.toURI()))) {
            var versions = new HashSet<String>();
            for (var path : paths.toList()) {
                String name = path.getFileName().toString();
                if (name.matches("V[0-9]+__.+\\.sql")) {
                    String version = name.substring(1,name.indexOf("__"));
                    assertTrue(versions.add(version), "Duplicate Flyway version: " + name);
                }
            }
        }
    }
}
