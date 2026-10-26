package com.smarthome.repository;
import com.smarthome.domain.NetworkProject;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface ProjectRepository extends JpaRepository<NetworkProject, UUID> {}
