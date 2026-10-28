package com.smarthome.repository;

import com.smarthome.domain.NetworkProject;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;

public interface ProjectRepository extends JpaRepository<NetworkProject, UUID> {
  @Query("select p.id from NetworkProject p order by p.id")
  List<UUID> inventoryProjectIds();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select p from NetworkProject p where p.id = :id")
  Optional<NetworkProject> lockById(UUID id);
}
