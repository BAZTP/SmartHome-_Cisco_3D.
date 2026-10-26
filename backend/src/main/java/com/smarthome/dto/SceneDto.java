package com.smarthome.dto;
import jakarta.validation.constraints.*;
public record SceneDto(
 @NotNull @Min(1) @Max(1) Integer version,
 @NotNull @Pattern(regexp="Isométrica|Superior|Interior") String view,
 @NotNull Boolean walls,
 @Size(max=100) String selected
) {}
