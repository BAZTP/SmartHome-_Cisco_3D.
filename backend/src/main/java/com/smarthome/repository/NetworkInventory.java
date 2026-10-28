package com.smarthome.repository;

import com.smarthome.dto.*;
import com.smarthome.service.NetworkSimulator;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Relational projection, replaced atomically with its portable project snapshot. */
@Repository
public class NetworkInventory {
  private final JdbcTemplate sql;
  private final NetworkSimulator simulator;

  public NetworkInventory(JdbcTemplate sql, NetworkSimulator simulator) {
    this.sql = sql;
    this.simulator = simulator;
  }

  public void replace(UUID id, SceneDto scene) {
    sql.update("DELETE FROM project_room WHERE project_id = ?", id);
    sql.update("DELETE FROM network_vlan WHERE project_id = ?", id);
    sql.update("DELETE FROM network_subnet WHERE project_id = ?", id);
    var design = scene.design() == null ? DesignDto.defaults() : scene.design();
    for (var r : design.rooms())
      sql.update("INSERT INTO project_room VALUES (?,?,?)", id, r.id(), r.name());
    if (scene.network() == null) return;
    for (var d : scene.network().devices()) {
      var c = simulator.config(d);
      sql.update(
          "INSERT INTO network_device VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          d.id(),
          d.room(),
          d.name(),
          d.kind(),
          d.x(),
          d.z(),
          d.rotation(),
          d.ip(),
          d.prefix(),
          d.on(),
          c.gateway(),
          c.nat(),
          c.light());
      for (int i = 0; i < c.interfaces().size(); i++) {
        var p = c.interfaces().get(i);
        sql.update(
            "INSERT INTO network_interface VALUES (?,?,?,?,?,?,?,?,?)",
            id,
            d.id(),
            i,
            p.enabled(),
            p.description(),
            p.mode(),
            p.vlan(),
            p.ip(),
            p.prefix());
        sql.update("INSERT INTO network_vlan VALUES (?,?) ON CONFLICT DO NOTHING", id, p.vlan());
        if (!p.ip().isEmpty())
          sql.update(
              "INSERT INTO network_subnet VALUES (?,host(network(?::inet)),?) ON CONFLICT DO"
                  + " NOTHING",
              id,
              p.ip() + "/" + p.prefix(),
              p.prefix());
      }
      for (int i = 0; i < c.routes().size(); i++) {
        var r = c.routes().get(i);
        sql.update(
            "INSERT INTO static_route VALUES (?,?,?,?,?,?)",
            id,
            d.id(),
            i,
            r.network(),
            r.prefix(),
            r.gateway());
      }
      for (int i = 0; i < c.firewall().size(); i++) {
        var r = c.firewall().get(i);
        sql.update(
            "INSERT INTO firewall_rule VALUES (?,?,?,?,?,?)",
            id,
            d.id(),
            i,
            r.action(),
            r.source(),
            r.destination());
      }
      if (c.dhcp() != null) {
        var p = c.dhcp();
        sql.update(
            "INSERT INTO dhcp_pool VALUES (?,?,?,?,?,?)",
            id,
            d.id(),
            p.start(),
            p.end(),
            p.gateway(),
            p.prefix());
      }
    }
    for (var l : scene.network().links())
      sql.update(
          "INSERT INTO network_link VALUES (?,?,?,?,?,?,?)",
          id,
          l.id(),
          l.a(),
          l.ap(),
          l.b(),
          l.bp(),
          l.kind() == null ? "Ethernet" : l.kind());
  }

  public Map<String, Object> read(UUID id) {
    var result = new LinkedHashMap<String, Object>();
    // Identifiers are a fixed allowlist, never supplied by the client.
    for (String table :
        List.of(
            "project_room",
            "network_device",
            "network_interface",
            "network_link",
            "network_vlan",
            "network_subnet",
            "static_route",
            "firewall_rule",
            "dhcp_pool"))
      result.put(table, sql.queryForList("SELECT * FROM " + table + " WHERE project_id = ?", id));
    return result;
  }
}
