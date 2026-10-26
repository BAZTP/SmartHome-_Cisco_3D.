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

 @Test void saveAndReloadScene(){
  String path="/api/projects/00000000-0000-0000-0000-000000000001/scene";
  var scene=new com.smarthome.dto.SceneDto(1,"Superior",false,"Oficina");
  var saved=http.exchange(path,org.springframework.http.HttpMethod.PUT,new org.springframework.http.HttpEntity<>(scene),String.class);
  assertThat(saved.getStatusCode().value()).isEqualTo(204);
  var loaded=http.getForObject(path,com.smarthome.dto.SceneDto.class);
  assertThat(loaded).isEqualTo(scene);
 }
 @Test void rejectsInvalidSceneAndMissingProject(){
  var invalid=new com.smarthome.dto.SceneDto(2,"Unknown",null,"Oficina");
  var response=http.exchange("/api/projects/00000000-0000-0000-0000-000000000001/scene",org.springframework.http.HttpMethod.PUT,new org.springframework.http.HttpEntity<>(invalid),String.class);
  assertThat(response.getStatusCode().value()).isEqualTo(400);
  assertThat(http.getForEntity("/api/projects/00000000-0000-0000-0000-000000000099/scene",String.class).getStatusCode().value()).isEqualTo(404);
 }
}
