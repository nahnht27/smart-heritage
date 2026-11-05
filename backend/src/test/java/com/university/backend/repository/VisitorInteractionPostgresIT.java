
package com.university.backend.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import javax.sql.DataSource;
import java.sql.Connection;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles(value = "postgres-test", inheritProfiles = false)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:postgresql://localhost:5432/smart_heritage_test",
    "spring.datasource.username=postgres",
    "spring.datasource.password=postgres",
    "spring.datasource.driver-class-name=org.postgresql.Driver",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect"
})
public class VisitorInteractionPostgresIT {

    @Autowired
    private DataSource dataSource;

    @Test
    void shouldConnectToPostgreSQL() throws Exception {

        try (Connection connection = dataSource.getConnection()) {

            String databaseName = connection.getCatalog();
            String databaseType =
                    connection.getMetaData().getDatabaseProductName();

            assertTrue(connection.isValid(5));

            assertEquals("PostgreSQL", databaseType);
            assertEquals("smart_heritage_test", databaseName);

            System.out.println("================================");
            System.out.println("PostgreSQL connected successfully!");
            System.out.println("Database: " + databaseName);
            System.out.println("Database type: " + databaseType);
            System.out.println("================================");
        }
    }
}
