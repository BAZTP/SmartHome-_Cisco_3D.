package com.smarthome.domain;
import jakarta.persistence.*;
import java.util.UUID;
@Entity
public class NetworkProject {
 @Id private UUID id;
 @Column(nullable=false,length=100) private String name;
 protected NetworkProject() {}
 public UUID getId(){return id;} public String getName(){return name;}
}
