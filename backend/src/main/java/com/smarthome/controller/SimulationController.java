package com.smarthome.controller;
import com.smarthome.dto.NetworkDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController
@RequestMapping("/api/simulation")
public class SimulationController {
 public record Request(@NotNull @Valid NetworkDto network,@NotBlank String source,@NotBlank String target){}
 public record Result(boolean ok,String message,List<String> path){}
 private final com.smarthome.service.NetworkSimulator simulator;
 public SimulationController(com.smarthome.service.NetworkSimulator simulator){this.simulator=simulator;}
 @PostMapping("/ping") public Result ping(@Valid @RequestBody Request request){return simulator.ping(request);}
}
