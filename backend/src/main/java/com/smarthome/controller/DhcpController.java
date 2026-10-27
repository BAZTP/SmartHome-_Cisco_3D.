package com.smarthome.controller;

import com.smarthome.dto.NetworkDto;
import com.smarthome.service.DhcpService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class DhcpController {
  public record Request(@NotNull @Valid NetworkDto network, @NotBlank String source) {}

  private final DhcpService service;

  public DhcpController(DhcpService service) {
    this.service = service;
  }

  @PostMapping("/api/simulation/dhcp")
  public NetworkDto.Device lease(@Valid @RequestBody Request r) {
    return service.lease(r.network(), r.source());
  }
}
