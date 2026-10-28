CREATE TABLE project_room (
 project_id UUID REFERENCES network_project(id) ON DELETE CASCADE,
 room_id INTEGER CHECK(room_id BETWEEN 0 AND 8), name VARCHAR(60) NOT NULL,
 PRIMARY KEY(project_id, room_id)
);
CREATE TABLE network_device (
 project_id UUID NOT NULL, device_id VARCHAR(100) NOT NULL, room_id INTEGER NOT NULL,
 name VARCHAR(60) NOT NULL, kind VARCHAR(50) NOT NULL,
 x DOUBLE PRECISION NOT NULL, z DOUBLE PRECISION NOT NULL, rotation DOUBLE PRECISION NOT NULL,
 ip VARCHAR(15) NOT NULL, prefix INTEGER NOT NULL, powered BOOLEAN NOT NULL,
 gateway VARCHAR(15) NOT NULL, nat BOOLEAN NOT NULL, light BOOLEAN NOT NULL,
 PRIMARY KEY(project_id, device_id),
 FOREIGN KEY(project_id, room_id) REFERENCES project_room(project_id, room_id) ON DELETE CASCADE
);
CREATE TABLE network_interface (
 project_id UUID NOT NULL, device_id VARCHAR(100) NOT NULL, port INTEGER NOT NULL,
 enabled BOOLEAN NOT NULL, description VARCHAR(100) NOT NULL, mode VARCHAR(10) NOT NULL,
 vlan INTEGER NOT NULL, ip VARCHAR(15) NOT NULL, prefix INTEGER NOT NULL,
 PRIMARY KEY(project_id, device_id, port),
 FOREIGN KEY(project_id, device_id) REFERENCES network_device(project_id, device_id) ON DELETE CASCADE
);
CREATE TABLE network_link (
 project_id UUID NOT NULL, link_id VARCHAR(100) NOT NULL,
 source_id VARCHAR(100) NOT NULL, source_port INTEGER NOT NULL,
 target_id VARCHAR(100) NOT NULL, target_port INTEGER NOT NULL, medium VARCHAR(12) NOT NULL,
 PRIMARY KEY(project_id, link_id),
 FOREIGN KEY(project_id, source_id, source_port) REFERENCES network_interface(project_id, device_id, port) ON DELETE CASCADE,
 FOREIGN KEY(project_id, target_id, target_port) REFERENCES network_interface(project_id, device_id, port) ON DELETE CASCADE
);
CREATE TABLE network_vlan (
 project_id UUID REFERENCES network_project(id) ON DELETE CASCADE, vlan_id INTEGER CHECK(vlan_id BETWEEN 1 AND 4094),
 PRIMARY KEY(project_id, vlan_id)
);
CREATE TABLE network_subnet (
 project_id UUID REFERENCES network_project(id) ON DELETE CASCADE, address VARCHAR(15), prefix INTEGER,
 PRIMARY KEY(project_id, address, prefix)
);
CREATE TABLE static_route (
 project_id UUID, device_id VARCHAR(100), ordinal INTEGER, network VARCHAR(15), prefix INTEGER, gateway VARCHAR(15),
 PRIMARY KEY(project_id, device_id, ordinal),
 FOREIGN KEY(project_id, device_id) REFERENCES network_device(project_id, device_id) ON DELETE CASCADE
);
CREATE TABLE firewall_rule (
 project_id UUID, device_id VARCHAR(100), ordinal INTEGER, action VARCHAR(10), source VARCHAR(15), destination VARCHAR(15),
 PRIMARY KEY(project_id, device_id, ordinal),
 FOREIGN KEY(project_id, device_id) REFERENCES network_device(project_id, device_id) ON DELETE CASCADE
);
CREATE TABLE dhcp_pool (
 project_id UUID, device_id VARCHAR(100), start_ip VARCHAR(15), end_ip VARCHAR(15), gateway VARCHAR(15), prefix INTEGER,
 PRIMARY KEY(project_id, device_id),
 FOREIGN KEY(project_id, device_id) REFERENCES network_device(project_id, device_id) ON DELETE CASCADE
);
