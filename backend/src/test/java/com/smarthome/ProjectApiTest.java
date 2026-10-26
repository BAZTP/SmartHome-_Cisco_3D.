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

 @Test void networkPingAndPersistence(){
  var pc=new com.smarthome.dto.NetworkDto.Device("pc","PC","PC",0,0,0,0,"192.168.1.101",24,true);
  var sw=new com.smarthome.dto.NetworkDto.Device("sw","Switch","Switch 2960",8,0,0,0,"192.168.1.2",24,true);
  var laptop=new com.smarthome.dto.NetworkDto.Device("lp","Laptop","Laptop",5,0,0,0,"192.168.1.102",24,true);
  var links=java.util.List.of(new com.smarthome.dto.NetworkDto.Link("a","pc","sw",0,0),new com.smarthome.dto.NetworkDto.Link("b","sw","lp",1,0));
  var net=new com.smarthome.dto.NetworkDto(java.util.List.of(pc,sw,laptop),links);
  var req=new com.smarthome.controller.SimulationController.Request(net,"pc","192.168.1.102");
  var result=http.postForObject("/api/simulation/ping",req,com.smarthome.controller.SimulationController.Result.class);
  assertThat(result.ok()).isTrue();assertThat(result.path()).containsExactly("pc","sw","lp");
  var broken=new com.smarthome.dto.NetworkDto(net.devices(),java.util.List.of(links.getFirst()));
  assertThat(http.postForObject("/api/simulation/ping",new com.smarthome.controller.SimulationController.Request(broken,"pc","192.168.1.102"),com.smarthome.controller.SimulationController.Result.class).ok()).isFalse();
  var scene=new com.smarthome.dto.SceneDto(1,"Superior",true,"Oficina",net);String path="/api/projects/00000000-0000-0000-0000-000000000001/scene";
  http.put(path,scene);assertThat(http.getForObject(path,com.smarthome.dto.SceneDto.class)).isEqualTo(scene);
 }
}
