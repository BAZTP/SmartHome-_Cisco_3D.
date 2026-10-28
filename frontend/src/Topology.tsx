import { useEffect, useState, memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  type Node,
  type NodeProps,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useNetwork, type Device, type Network, type Link } from "./network";
import { configuration } from "./advanced";
import { useDesign } from "./design";
export function topologyLayout(
  n: Network,
): Record<string, { x: number; y: number }> {
  const root = n.devices.find((d) => d.kind === "Internet") ?? n.devices[0];
  const depth = new Map<string, number>();
  if (root) depth.set(root.id, 0);
  const queue = root ? [root.id] : [];
  while (queue.length) {
    const id = queue.shift()!;
    for (const l of n.links) {
      const peer = l.a === id ? l.b : l.b === id ? l.a : null;
      if (peer && !depth.has(peer)) {
        depth.set(peer, depth.get(id)! + 1);
        queue.push(peer);
      }
    }
  }
  const last = Math.max(0, ...depth.values()) + 1;
  n.devices.forEach((d) => {
    if (!depth.has(d.id)) depth.set(d.id, last);
  });
  return Object.fromEntries(
    n.devices.map((d) => {
      const level = depth.get(d.id)!;
      const row = n.devices.filter((v) => depth.get(v.id) === level);
      return [
        d.id,
        {
          x:
            row.findIndex((v) => v.id === d.id) * 245 -
            (row.length - 1) * 122.5,
          y: level * 300,
        },
      ];
    }),
  );
}
type DeviceNode = Node<
  { device: Device; occupied: number[]; compact: boolean },
  "device"
>;
const DeviceCard = memo(({ data, selected }: NodeProps<DeviceNode>) => (
  <div
    className={"topology-node " + (selected ? "chosen" : "")}
    role="button"
    tabIndex={0}
    aria-label={"Topología " + data.device.name}
    onClick={() => useNetwork.getState().select(data.device.id)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ")
        useNetwork.getState().select(data.device.id);
    }}
  >
    <strong>
      <i className={data.device.on ? "online-dot" : "offline-dot"} />
      {data.device.name.length > 24 ? data.device.kind : data.device.name}
    </strong>
    <small>
      {data.device.kind} · {data.device.ip}
    </small>
    {configuration(data.device).interfaces.map((p, i) => (
      <div className="topology-port" key={i}>
        <Handle
          type="target"
          id={String(i)}
          position={Position.Left}
          style={{ top: "50%" }}
          isConnectable={!data.compact && !data.occupied.includes(i)}
          aria-label={data.device.name + " entrada eth" + i}
        />
        <span>
          eth{i} · {p.enabled && data.device.on ? "up" : "down"} · {p.mode}{" "}
          {p.vlan}
          {data.occupied.includes(i) ? " · conectado" : ""}
        </span>
        <Handle
          type="source"
          id={String(i)}
          position={Position.Right}
          style={{ top: "50%" }}
          isConnectable={!data.compact && !data.occupied.includes(i)}
          aria-label={data.device.name + " salida eth" + i}
        />
      </div>
    ))}
  </div>
));
const nodeTypes = { device: DeviceCard };
export default function Topology({ compact = false }: { compact?: boolean }) {
  const n = useNetwork(),
    design = useDesign();
  const [nodes, setNodes, onNodesChange] = useNodesState<DeviceNode>([]);
  const [medium, MED] = useState<Link["kind"]>("Ethernet"),
    [message, M] = useState(""),
    [edge, E] = useState<string | null>(null);
  useEffect(() => {
    const automatic = topologyLayout(n);
    setNodes(
      n.devices.map((device) => ({
        id: device.id,
        type: "device",
        position: compact
          ? {
              x: automatic[device.id].x * 0.8,
              y: (automatic[device.id].y / 300) * 80,
            }
          : (design.topology[device.id] ?? automatic[device.id]),
        selected: n.selected === device.id,
        data: {
          device,
          compact,
          occupied: n.links.flatMap((l) =>
            l.a === device.id ? [l.ap] : l.b === device.id ? [l.bp] : [],
          ),
        },
      })),
    );
  }, [n.devices, n.links, n.selected, design.topology, compact, setNodes]);
  const edges: Edge[] = n.links.map((l) => {
    const a = n.devices.find((d) => d.id === l.a)!,
      b = n.devices.find((d) => d.id === l.b)!;
    const up =
      a.on &&
      b.on &&
      configuration(a).interfaces[l.ap].enabled &&
      configuration(b).interfaces[l.bp].enabled;
    return {
      id: l.id,
      source: l.a,
      target: l.b,
      sourceHandle: String(l.ap),
      targetHandle: String(l.bp),
      type: "smoothstep",
      selected: edge === l.id,
      label: compact
        ? undefined
        : `${l.kind ?? "Ethernet"} · eth${l.ap} ↔ eth${l.bp}`,
      style: {
        stroke: up ? (l.kind === "Wi-Fi" ? "#38bdf8" : "#35d6a3") : "#ff6579",
        strokeWidth: edge === l.id ? 4 : 2,
      },
      labelStyle: { fill: "#e2f1ff", fontSize: 11 },
      labelBgStyle: { fill: "#102337" },
    };
  });
  function connect(c: Connection) {
    try {
      n.connect(
        c.source,
        c.target,
        Number(c.sourceHandle),
        Number(c.targetHandle),
        medium,
      );
      M("Enlace creado desde la topología");
    } catch (e) {
      M(String(e));
    }
  }
  return (
    <div
      className={"topology-editor " + (compact ? "compact" : "")}
      aria-label={compact ? "Topología de red" : "Editor de topología"}
    >
      {!compact && (
        <>
          <h3>Editor de topología lógica</h3>
          <p>
            Arrastra los nodos. Conecta un puerto de salida a uno de entrada
            libre. Selecciona un cable para eliminarlo; guarda el proyecto para
            conservar las posiciones.
          </p>
          <div className="topology-toolbar">
            <label>
              Medio de topología
              <select
                aria-label="Medio de topología"
                value={medium}
                onChange={(e) => MED(e.target.value as Link["kind"])}
              >
                <option>Ethernet</option>
                <option>Wi-Fi</option>
                <option>Fibra</option>
              </select>
            </label>
            <button onClick={() => useDesign.setState({ topology: {} })}>
              Ordenar topología
            </button>
            <button
              disabled={!edge || !n.links.some((l) => l.id === edge)}
              onClick={() => {
                if (edge) n.disconnect(edge);
                E(null);
                M("Enlace eliminado");
              }}
            >
              Eliminar enlace seleccionado
            </button>
            <button
              disabled={!n.selected}
              onClick={() => {
                if (n.selected) design.focusDevice(n.selected);
                document.getElementById("design")?.scrollIntoView();
              }}
            >
              Enfocar equipo en casa
            </button>
          </div>
          <p aria-live="polite" aria-label="Estado de topología">
            {message}
          </p>
        </>
      )}
      <div style={{ height: compact ? 320 : "min(600px, 65vh)" }}>
        <ReactFlow
          id={compact ? "network-preview" : "network-editor"}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => n.select(node.id)}
          onNodeDragStop={(_, node) =>
            useDesign.setState((s) => ({
              topology: { ...s.topology, [node.id]: node.position },
            }))
          }
          onConnect={connect}
          onEdgeClick={(_, e) => E(e.id)}
          onEdgesDelete={(es) => es.forEach((e) => n.disconnect(e.id))}
          onNodesDelete={(ns) => ns.forEach((d) => n.remove(d.id))}
          nodesDraggable={!compact}
          nodesConnectable={!compact}
          deleteKeyCode={compact ? null : ["Backspace", "Delete"]}
          fitView
          minZoom={0.15}
          maxZoom={2}
          colorMode="dark"
          proOptions={{ hideAttribution: false }}
        >
          <Background color="#24445b" gap={22} />
          {!compact && (
            <>
              <Controls />
              <MiniMap nodeColor="#248a97" maskColor="#07121daa" />
            </>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
