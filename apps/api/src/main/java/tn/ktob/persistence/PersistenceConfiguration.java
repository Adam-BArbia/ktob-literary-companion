package tn.ktob.persistence;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;

/**
 * Opt-in database wiring. No URL/project configured -> no data access beans.
 * Migrations run ONLY when KTOB_AUTO_MIGRATE=true (disposable CI/local database).
 * Production should migrate in its own reviewed one-time deployment step.
 */
@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "ktob.persistence.enabled", havingValue = "true")
public class PersistenceConfiguration {

    @Bean(destroyMethod = "close")
    DataSource dataSource(
        @Value("${DATABASE_JDBC_URL:}") String url,
        @Value("${DATABASE_USERNAME:}") String username,
        @Value("${DATABASE_PASSWORD:}") String password,
        @Value("${KTOB_AUTO_MIGRATE:false}") boolean autoMigrate) {
        if (!url.startsWith("jdbc:postgresql://") || username.isBlank() || password.isBlank()) {
            throw new IllegalStateException("Complete PostgreSQL credentials required");
        }
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setMaximumPoolSize(4);
        config.setMinimumIdle(0);
        config.setConnectionTimeout(8000);
        HikariDataSource ds = new HikariDataSource(config);
        if (autoMigrate) {
            Flyway.configure().dataSource(ds).locations("classpath:db/migration")
                .defaultSchema("app").schemas("app").createSchemas(true).load().migrate();
        }
        return ds;
    }

    @Bean
    JdbcTemplate jdbcTemplate(DataSource ds) { return new JdbcTemplate(ds); }

    @Bean
    PlatformTransactionManager transactionManager(DataSource ds) {
        return new DataSourceTransactionManager(ds);
    }
}
