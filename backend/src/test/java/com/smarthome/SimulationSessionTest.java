package com.smarthome;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthome.dto.NetworkDto;
import com.smarthome.repository.ProjectRepository;
import com.smarthome.service.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class SimulationSessionTest {
  @Test
  void startTicksObserveCurrentNetworkAndPauseStopsTraffic() throws Exception {
    var events = mock(EventService.class);
    var projects = mock(ProjectRepository.class);
    var id = UUID.randomUUID();
    when(projects.existsById(id)).thenReturn(true);
    var service =
        new SimulationSessionService(new RuntimeService(new NetworkSimulator()), events, projects);
    var mapper = new ObjectMapper();
    var n =
        mapper.treeToValue(
            mapper.readTree(getClass().getResourceAsStream("/runtime-cases.json")).get("network"),
            NetworkDto.class);
    assertThat(service.start(id, n, "PC", "192.168.1.102").running()).isTrue();
    assertThat(service.step(id, n).result().ok()).isTrue();
    var disconnected =
        new NetworkDto(n.devices(), n.links().stream().filter(l -> !l.id().equals("sl")).toList());
    assertThat(service.step(id, disconnected).result().ok()).isFalse();
    assertThat(service.pause(id).running()).isFalse();
    assertThatThrownBy(() -> service.step(id, n)).isInstanceOf(ResponseStatusException.class);
    verify(events, times(2)).record(eq(id), eq("PC"), eq("192.168.1.102"), any());
  }
}
