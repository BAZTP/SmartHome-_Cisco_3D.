import { runtime } from "./runtime.ts";
import { configuration, dhcpLease } from "./advanced.ts";
import { type Network, validateNetwork, ipv4, ping } from "./network.ts";
export type Context = {
  mode: "EXEC" | "PRIVILEGIADO" | "CONFIG" | "INTERFACE";
  port: number;
};
export const commands = [
  "show arp",
  "show mac address-table",
  "show ip nat translations",
  "enable",
  "disable",
  "configure terminal",
  "exit",
  "end",
  "hostname",
  "interface",
  "description",
  "ip address",
  "shutdown",
  "no shutdown",
  "show ip interface brief",
  "show running-config",
  "show interfaces",
  "show ip route",
  "show vlan brief",
  "vlan",
  "switchport mode access",
  "switchport mode trunk",
  "switchport access vlan",
  "ip route",
  "ping",
  "traceroute",
  "write memory",
  "ip dhcp",
];
export function execute(
  network: Network,
  id: string,
  context: Context,
  command: string,
  scope = "session",
) {
  const n = structuredClone(network),
    d = n.devices.find((v) => v.id === id);
  if (!d) throw Error("Selecciona un dispositivo");
  const c = configuration(d);
  d.config = c;
  let trace: ReturnType<typeof ping> | null = null;
  let ctx = { ...context },
    output = "",
    save = false;
  const text = command.trim(),
    parts = text.split(/\s+/),
    iface = c.interfaces[ctx.port];
  const error = () => {
    throw Error("Sintaxis o modo incorrecto. Usa ?");
  };
  const prefix = (mask: string) => {
    if (/^\d+$/.test(mask)) {
      const v = Number(mask);
      if (v >= 1 && v <= 30) return v;
    }
    const value = ipv4(mask);
    if (value !== null) {
      const bits = value.toString(2).padStart(32, "0");
      if (/^1+0+$/.test(bits)) {
        const count = bits.indexOf("0");
        if (count <= 30) return count;
      }
    }
    throw Error("Máscara inválida");
  };
  if (text === "?") output = commands.join("\n");
  else if (text === "enable" && ctx.mode === "EXEC") {
    ctx.mode = "PRIVILEGIADO";
  } else if (text === "disable") {
    ctx.mode = "EXEC";
  } else if (text === "configure terminal" && ctx.mode === "PRIVILEGIADO") {
    ctx.mode = "CONFIG";
  } else if (text === "end") {
    ctx.mode = "PRIVILEGIADO";
  } else if (text === "exit") {
    ctx.mode =
      ctx.mode === "INTERFACE"
        ? "CONFIG"
        : ctx.mode === "CONFIG"
          ? "PRIVILEGIADO"
          : "EXEC";
  } else if (
    ["show arp", "show mac address-table", "show ip nat translations"].includes(
      text,
    )
  ) {
    const tables = runtime(n, scope, { action: "inspect" }).tables;
    output = JSON.stringify(
      (text === "show arp"
        ? tables.arp
        : text === "show mac address-table"
          ? tables.mac
          : tables.pat
      ).filter((e) => e.device === id),
      null,
      2,
    );
  } else if (text === "show running-config")
    output = JSON.stringify(c, null, 2);
  else if (text === "show ip interface brief" || text === "show interfaces")
    output = c.interfaces
      .map(
        (p, i) =>
          `eth${i} ${p.ip || "unassigned"}/${p.prefix} ${p.enabled && d.on ? "up" : "down"} VLAN ${p.vlan} ${p.description}`,
      )
      .join("\n");
  else if (text === "show ip route")
    output =
      c.routes
        .map((r) => `${r.network}/${r.prefix} via ${r.gateway}`)
        .join("\n") || "Sin rutas estáticas";
  else if (text === "show vlan brief")
    output = c.interfaces
      .map((p, i) => `eth${i}: ${p.mode} VLAN ${p.vlan}`)
      .join("\n");
  else if (
    (parts[0] === "ping" || parts[0] === "traceroute") &&
    parts.length === 2
  ) {
    const result = runtime(n, scope, {
      action: "probe",
      source: id,
      target: parts[1],
    }).result!;
    trace = result;
    output =
      result.message +
      "\n" +
      result.path
        .map((x, i) => `${i + 1} ${n.devices.find((v) => v.id === x)?.name}`)
        .join("\n");
  } else if (text === "write memory" && ctx.mode === "PRIVILEGIADO") {
    save = true;
    output = "Configuración preparada para guardar";
  } else if (text === "ip dhcp" && ctx.mode === "CONFIG") {
    Object.assign(d, dhcpLease(n, id));
  } else if (
    parts[0] === "hostname" &&
    parts.length === 2 &&
    ctx.mode === "CONFIG"
  ) {
    d.name = parts[1];
  } else if (
    parts[0] === "interface" &&
    ctx.mode === "CONFIG" &&
    parts.length === 2
  ) {
    const i = Number(parts[1].replace(/^eth/, ""));
    if (!Number.isInteger(i) || !c.interfaces[i]) error();
    ctx.port = i;
    ctx.mode = "INTERFACE";
  } else if (ctx.mode === "INTERFACE" && text.startsWith("description ")) {
    iface.description = text.slice(12);
  } else if (
    ctx.mode === "INTERFACE" &&
    parts[0] === "ip" &&
    parts[1] === "address" &&
    parts.length === 4
  ) {
    if (ipv4(parts[2]) === null) error();
    iface.ip = parts[2];
    iface.prefix = prefix(parts[3]);
    if (ctx.port === 0) {
      d.ip = iface.ip;
      d.prefix = iface.prefix;
    }
  } else if (
    ctx.mode === "INTERFACE" &&
    ["shutdown", "no shutdown"].includes(text)
  ) {
    iface.enabled = text === "no shutdown";
  } else if (
    ctx.mode === "INTERFACE" &&
    /^switchport mode (access|trunk)$/.test(text)
  ) {
    iface.mode = parts[2] as "access" | "trunk";
  } else if (
    ctx.mode === "INTERFACE" &&
    /^switchport access vlan \d+$/.test(text)
  ) {
    iface.vlan = Number(parts[3]);
  } else if (
    ctx.mode === "CONFIG" &&
    parts[0] === "ip" &&
    parts[1] === "route" &&
    parts.length === 5
  ) {
    c.routes.push({
      network: parts[2],
      prefix: parts[3] === "0.0.0.0" ? 0 : prefix(parts[3]),
      gateway: parts[4],
    });
  } else if (ctx.mode === "CONFIG" && /^vlan \d+$/.test(text)) {
    output =
      "VLAN " +
      parts[1] +
      " disponible; asigna sus puertos con switchport access vlan";
    if (Number(parts[1]) < 1 || Number(parts[1]) > 4094) error();
  } else error();
  return {
    network: validateNetwork(n),
    context: ctx,
    output: output || "OK",
    save,
    trace,
  };
}
