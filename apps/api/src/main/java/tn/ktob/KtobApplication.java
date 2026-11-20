package tn.ktob;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * One modular Spring Boot deployment; additional domain modules will be introduced
 * without changing the published KTOB /api/v1 service boundary.
 */
@SpringBootApplication
public class KtobApplication {

    public static void main(String[] args) {
        SpringApplication.run(KtobApplication.class, args);
    }
}
