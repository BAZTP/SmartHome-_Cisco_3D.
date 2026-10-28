package com.smarthome.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;

public record DesignDto(
    @NotNull @Size(min = 1, max = 9) List<@Valid Room> rooms,
    @NotNull @Size(max = 100) Map<String, @Valid Point> topology,
    @Valid Camera camera,
    @NotNull Boolean connections,
    @NotNull @Pattern(regexp = "balanced|high") String quality) {
  public record Room(@NotNull @Min(0) @Max(8) Integer id, @NotBlank @Size(max = 60) String name) {}

  public record Point(
      @NotNull @DecimalMin("-10000") @DecimalMax("10000") Double x,
      @NotNull @DecimalMin("-10000") @DecimalMax("10000") Double y) {}

  public record Camera(
      @NotNull @Size(min = 3, max = 3)
          List<@NotNull @DecimalMin("-100") @DecimalMax("100") Double> position,
      @NotNull @Size(min = 3, max = 3)
          List<@NotNull @DecimalMin("-100") @DecimalMax("100") Double> target) {
    @JsonIgnore
    @AssertTrue
    public boolean isDirectionValid() {
      if (position == null
          || target == null
          || position.size() != 3
          || target.size() != 3
          || position.stream().anyMatch(Objects::isNull)
          || target.stream().anyMatch(Objects::isNull)) return false;
      double sum = 0;
      for (int i = 0; i < 3; i++) sum += Math.pow(position.get(i) - target.get(i), 2);
      return Double.isFinite(sum) && sum >= .01;
    }
  }

  public static DesignDto defaults() {
    String[] names = {
      "Sala",
      "Comedor",
      "Cocina",
      "Dormitorio principal",
      "Dormitorio secundario",
      "Oficina",
      "Garaje",
      "Jardín",
      "Telecomunicaciones"
    };
    var rooms = new ArrayList<Room>();
    for (int i = 0; i < names.length; i++) rooms.add(new Room(i, names[i]));
    return new DesignDto(rooms, Map.of(), null, true, "high");
  }

  @JsonIgnore
  @AssertTrue
  public boolean isUnique() {
    return rooms != null
        && rooms.stream().allMatch(Objects::nonNull)
        && rooms.stream().map(Room::id).distinct().count() == rooms.size()
        && rooms.stream().map(r -> r.name() == null ? "" : r.name().strip()).distinct().count()
            == rooms.size();
  }
}
