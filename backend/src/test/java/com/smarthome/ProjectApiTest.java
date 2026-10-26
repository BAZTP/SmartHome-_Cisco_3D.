package com.smarthome;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import static org.assertj.core.api.Assertions.assertThat;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProjectApiTest {
 @Autowired TestRestTemplate http;
 @Test void databaseMigrationAndApiWork(){var response=http.getForEntity("/api/projects",String.class);assertThat(response.getStatusCode().value()).isEqualTo(200);assertThat(response.getBody()).contains("Casa de demostración","00000000-0000-0000-0000-000000000001");}
 @Test void healthIsUp(){assertThat(http.getForObject("/actuator/health",String.class)).contains("UP");}
}
