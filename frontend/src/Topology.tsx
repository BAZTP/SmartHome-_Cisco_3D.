import { useNetwork } from "./network";
import { configuration } from "./advanced";
/** Deterministic layered layout; selection is shared with the 3D scene. */
export default function Topology({ compact = false }: { compact?: boolean }) {
  const n = useNetwork(),
    root =
      n.devices.find((d) => d.kind === "Internet") ??
      n.devices.find((d) => d.kind.startsWith("Router")) ??
      n.devices[0];
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
  const disconnected = Math.max(0, ...depth.values()) + 1;
  n.devices.forEach((d) => {
    if (!depth.has(d.id)) depth.set(d.id, disconnected);
  });
  const layers = Array.from(
    { length: Math.max(0, ...depth.values()) + 1 },
    (_, i) => n.devices.filter((d) => depth.get(d.id) === i),
  );
  const width = Math.max(
    compact ? 320 : 700,
    Math.max(1, ...layers.map((v) => v.length)) * 100,
  );
  const position = (id: string) => {
    const level = depth.get(id)!,
      row = layers[level];
    return [
      (width * (row.findIndex((d) => d.id === id) + 1)) / (row.length + 1),
      30 + level * 65,
    ];
  };
  return (
    <svg
      viewBox={`0 0 ${width} ${layers.length * 65}`}
      className={"topology " + (compact ? "compact" : "")}
      aria-label="Topología de red"
    >
      {n.links.map((l) => {
        const a = n.devices.find((d) => d.id === l.a)!,
          b = n.devices.find((d) => d.id === l.b)!,
          [ax, ay] = position(l.a),
          [bx, by] = position(l.b);
        const on =
          a.on &&
          b.on &&
          configuration(a).interfaces[l.ap].enabled &&
          configuration(b).interfaces[l.bp].enabled;
        return (
          <path
            key={l.id}
            d={`M${ax} ${ay} V${(ay + by) / 2} H${bx} V${by}`}
            fill="none"
            stroke={
              on ? (l.kind === "Wi-Fi" ? "#36aaff" : "#32bc91") : "#f75b70"
            }
            strokeWidth="2"
          />
        );
      })}
      {n.devices.map((d) => {
        const [x, y] = position(d.id);
        return (
          <g
            key={d.id}
            role="button"
            tabIndex={0}
            aria-label={"Topología " + d.name}
            onClick={() => n.select(d.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                n.select(d.id);
              }
            }}
          >
            <rect
              x={x - 44}
              y={y - 18}
              width={88}
              height={36}
              rx={6}
              fill={d.id === n.selected ? "#23597a" : "#122e41"}
              stroke={d.on ? "#39d6a8" : "#f75b70"}
            />
            <text
              x={x}
              y={y + 4}
              fill="#dceaf6"
              textAnchor="middle"
              fontSize="11"
            >
              {d.name.length > 12 ? d.kind.slice(0, 12) : d.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
