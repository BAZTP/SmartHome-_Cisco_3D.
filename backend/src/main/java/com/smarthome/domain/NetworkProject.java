package com.smarthome.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
public class NetworkProject {
    @Id
    private UUID id;
    @Column(nullable = false, length = 100)
    private String name;
    @Column(columnDefinition = "text")
    private String sceneState;

    protected NetworkProject() {}

    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getSceneState() { return sceneState; }
    public void setSceneState(String value) { sceneState = value; }
}
