package tn.ktob;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * One modular Spring Boot deployment; additional domain modules will be introduced
 * without changing the published KTOB /api/v1 service boundary.
 */
@SpringBootApplication(excludeName = {
    "org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration",
    "org.springframework.boot.flyway.autoconfigure.FlywayAutoConfiguration"
})
public class KtobApplication {

    public static void main(String[] args) {
        SpringApplication.run(KtobApplication.class, args);
    }
}
