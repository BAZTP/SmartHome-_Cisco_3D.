package com.smarthome.controller;
import com.smarthome.service.ProjectService;
import com.smarthome.dto.ProjectDto;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController
@RequestMapping("/api/projects")
public class ProjectController {
 private final ProjectService service;
 public ProjectController(ProjectService service){this.service=service;}
 @GetMapping public List<ProjectDto> list(){return service.list();}
}
