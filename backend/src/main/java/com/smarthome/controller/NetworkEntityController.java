package com.smarthome.controller;

import com.smarthome.dto.*;
import com.smarthome.repository.NetworkInventory;
import com.smarthome.service.NetworkEntityService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{project}")
public class NetworkEntityController {
  private final NetworkEntityService service;
  private final NetworkInventory inventory;

  public NetworkEntityController(NetworkEntityService service, NetworkInventory inventory) {
    this.service = service;
    this.inventory = inventory;
  }

  @GetMapping("/rooms")
  public Object rooms(@PathVariable UUID project) {
    return service.list(project, "rooms");
  }

  @GetMapping("/rooms/{id}")
  public Object room(@PathVariable UUID project, @PathVariable int id) {
    return service.get(project, "rooms", "" + id);
  }

  @PostMapping("/rooms")
  @ResponseStatus(HttpStatus.CREATED)
  public Object addRoom(@PathVariable UUID project, @Valid @RequestBody DesignDto.Room room) {
    return service.save(project, "rooms", "" + room.id(), room, true);
  }

  @PutMapping("/rooms/{id}")
  public Object room(
      @PathVariable UUID project, @PathVariable int id, @Valid @RequestBody DesignDto.Room room) {
    return service.save(project, "rooms", "" + id, room, false);
  }

  @DeleteMapping("/rooms/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteRoom(@PathVariable UUID project, @PathVariable int id) {
    service.delete(project, "rooms", "" + id);
  }

  @GetMapping("/devices")
  public Object devices(@PathVariable UUID project) {
    return service.list(project, "devices");
  }

  @GetMapping("/devices/{id}")
  public Object device(@PathVariable UUID project, @PathVariable String id) {
    return service.get(project, "devices", id);
  }

  @PostMapping("/devices")
  @ResponseStatus(HttpStatus.CREATED)
  public Object addDevice(
      @PathVariable UUID project, @Valid @RequestBody NetworkDto.Device device) {
    return service.save(project, "devices", device.id(), device, true);
  }

  @PutMapping("/devices/{id}")
  public Object device(
      @PathVariable UUID project,
      @PathVariable String id,
      @Valid @RequestBody NetworkDto.Device device) {
    return service.save(project, "devices", id, device, false);
  }

  @DeleteMapping("/devices/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteDevice(@PathVariable UUID project, @PathVariable String id) {
    service.delete(project, "devices", id);
  }

  @GetMapping("/devices/{id}/interfaces")
  public Object interfaces(@PathVariable UUID project, @PathVariable String id) {
    return service.config(project, id).interfaces();
  }

  @PutMapping("/devices/{id}/interfaces/{port}")
  public Object port(
      @PathVariable UUID project,
      @PathVariable String id,
      @PathVariable int port,
      @Valid @RequestBody NetworkDto.Port value) {
    return service.port(project, id, port, value);
  }

  @GetMapping("/devices/{id}/configuration")
  public Object config(@PathVariable UUID project, @PathVariable String id) {
    return service.config(project, id);
  }

  @PutMapping("/devices/{id}/configuration")
  public Object config(
      @PathVariable UUID project,
      @PathVariable String id,
      @Valid @RequestBody NetworkDto.Config value) {
    return service.configure(project, id, value);
  }

  @GetMapping("/links")
  public Object links(@PathVariable UUID project) {
    return service.list(project, "links");
  }

  @GetMapping("/links/{id}")
  public Object link(@PathVariable UUID project, @PathVariable String id) {
    return service.get(project, "links", id);
  }

  @PostMapping("/links")
  @ResponseStatus(HttpStatus.CREATED)
  public Object addLink(@PathVariable UUID project, @Valid @RequestBody NetworkDto.Link value) {
    return service.save(project, "links", value.id(), value, true);
  }

  @PutMapping("/links/{id}")
  public Object link(
      @PathVariable UUID project,
      @PathVariable String id,
      @Valid @RequestBody NetworkDto.Link value) {
    return service.save(project, "links", id, value, false);
  }

  @DeleteMapping("/links/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void deleteLink(@PathVariable UUID project, @PathVariable String id) {
    service.delete(project, "links", id);
  }

  @GetMapping("/topology")
  public NetworkDto topology(@PathVariable UUID project) {
    return service.scene(project).network();
  }

  @GetMapping("/inventory")
  public Object inventory(@PathVariable UUID project) {
    service.scene(project);
    return inventory.read(project);
  }
}
