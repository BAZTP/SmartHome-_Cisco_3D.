package com.smarthome.service;
import com.smarthome.dto.ProjectDto;
import com.smarthome.repository.ProjectRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
@Service
public class ProjectService {
 private final ProjectRepository repository;
 public ProjectService(ProjectRepository repository){this.repository=repository;}
 @Transactional(readOnly=true)
 public List<ProjectDto> list(){return repository.findAll().stream().map(p->new ProjectDto(p.getId(),p.getName())).toList();}
}
