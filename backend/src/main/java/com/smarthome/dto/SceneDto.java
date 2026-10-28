package com.smarthome.dto;

import jakarta.validation.constraints.*;

public record SceneDto(
    @NotNull @Min(1) @Max(1) Integer version,
    @NotNull @Pattern(regexp = "Isométrica|Superior|Interior") String view,
    @NotNull Boolean walls,
    @Size(max = 100) String selected,
    @jakarta.validation.Valid NetworkDto network,
    @jakarta.validation.Valid ModelLibrary models,
    @jakarta.validation.Valid DesignDto design) {
  public SceneDto(
      Integer version,
      String view,
      Boolean walls,
      String selected,
      NetworkDto network,
      ModelLibrary models) {
    this(version, view, walls, selected, network, models, null);
  }

  @com.fasterxml.jackson.annotation.JsonIgnore
  @AssertTrue(message = "Habitación o posición lógica inexistente")
  public boolean isDesignAssignmentValid() {
    if (design == null) return true;
    if (design.rooms() == null || design.topology() == null) return false;
    var devices =
        network == null || network.devices() == null
            ? java.util.List.<NetworkDto.Device>of()
            : network.devices();
    var rooms =
        design.rooms().stream().filter(java.util.Objects::nonNull).map(DesignDto.Room::id).toList();
    return devices.stream().allMatch(d -> d != null && rooms.contains(d.room()))
        && design.topology().keySet().stream()
            .allMatch(id -> devices.stream().anyMatch(d -> d.id().equals(id)));
  }

  public SceneDto(Integer version, String view, Boolean walls, String selected) {
    this(version, view, walls, selected, null, null);
  }

  public SceneDto(
      Integer version, String view, Boolean walls, String selected, NetworkDto network) {
    this(version, view, walls, selected, network, null);
  }

  @com.fasterxml.jackson.annotation.JsonIgnore
  @AssertTrue(message = "El modelo debe pertenecer a un dispositivo existente")
  public boolean isModelAssignmentValid() {
    if (models == null) return true;
    if (models.devices() == null || network == null || network.devices() == null)
      return models.devices() != null && models.devices().isEmpty();
    var ids =
        network.devices().stream()
            .filter(java.util.Objects::nonNull)
            .map(NetworkDto.Device::id)
            .toList();
    return models.devices().keySet().stream().allMatch(ids::contains);
  }
}
