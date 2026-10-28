import { useDesign } from "./design";
import DeviceModel from "./DeviceModel";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import type { Mesh } from "three";
import { Plane, Vector3, Raycaster, Vector2 } from "three";
import { configuration } from "./advanced";
import { Html, Line } from "@react-three/drei";
import { useNetwork } from "./network";
import { layout } from "./Architecture";
type Vec = [number, number, number];
const cablePoints = (a: Vec, b: Vec): Vec[] => [
  a,
  [a[0], 0.2, a[2]],
  [a[0], 0.2, b[2]],
  [b[0], 0.2, b[2]],
  b,
];
function Packet({ points }: { points: Vec[] }) {
  const ref = useRef<Mesh>(null),
    elapsed = useRef(0),
    segment = useRef(""),
    initial = useRef(points.at(-1));
  useFrame((_, delta) => {
    if (!ref.current) return;
    const state = useNetwork.getState(),
      key = JSON.stringify(points);
    if (segment.current !== key) {
      segment.current = key;
      elapsed.current = 0;
      ref.current.position.set(...(state.playing ? points[0] : points.at(-1)!));
    }
    if (!state.playing) return;
    elapsed.current = Math.min(0.75, elapsed.current + delta);
    const lengths = points
      .slice(1)
      .map((p, i) => Math.hypot(...p.map((v, j) => v - points[i][j])));
    let distance =
      (lengths.reduce((a, b) => a + b, 0) * elapsed.current) / 0.75;
    for (let i = 0; i < lengths.length; i++) {
      if (distance <= lengths[i] || i === lengths.length - 1) {
        const fraction = lengths[i] ? Math.min(1, distance / lengths[i]) : 1;
        ref.current.position.set(
          ...(points[i].map(
            (v, j) => v + (points[i + 1][j] - v) * fraction,
          ) as Vec),
        );
        break;
      }
      distance -= lengths[i];
    }
  });
  return (
    <mesh ref={ref} position={initial.current}>
      <sphereGeometry args={[0.14, 16, 16]} />
      <meshBasicMaterial color="#ffe96a" />
    </mesh>
  );
}
export default function NetworkScene() {
  const { camera, gl } = useThree();
  const connections = useDesign((s) => s.connections);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);
  function dragLabel(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.preventDefault();
    e.stopPropagation();
    cleanup.current();
    const d = useNetwork.getState().devices.find((v) => v.id === id)!;
    const startX = e.clientX,
      startY = e.clientY;
    const project = (x: number, y: number) => {
      const rect = gl.domElement.getBoundingClientRect(),
        ray = new Raycaster(),
        point = new Vector3();
      ray.setFromCamera(
        new Vector2(
          ((x - rect.left) / rect.width) * 2 - 1,
          (-(y - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      return ray.ray.intersectPlane(
        new Plane(new Vector3(0, 1, 0), -0.95),
        point,
      );
    };
    const origin = project(startX, startY);
    if (!origin) return;
    useNetwork.getState().select(id);
    useNetwork.setState({ dragging: true });
    const move = (event: PointerEvent) => {
      const point = project(event.clientX, event.clientY);
      if (!point) return;
      point
        .sub(origin)
        .add(
          new Vector3(layout[d.room][0] + d.x, 0.95, layout[d.room][1] + d.z),
        );
      let room = 0,
        best = Infinity;
      layout.forEach(([x, z], i) => {
        if (!useDesign.getState().rooms.some((r) => r.id === i)) return;
        const distance = (x - point.x) ** 2 + (z - point.z) ** 2;
        if (distance < best) {
          best = distance;
          room = i;
        }
      });
      useNetwork.getState().update(id, {
        room,
        x: Math.max(-1.8, Math.min(1.8, point.x - layout[room][0])),
        z: Math.max(-1.5, Math.min(1.5, point.z - layout[room][1])),
      });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      useNetwork.setState({ dragging: false });
    };
    cleanup.current = end;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  }

  const { devices, links, selected, select, trace, step, update, dragging } =
    useNetwork();
  const position = (id: string): [number, number, number] => {
    const d = devices.find((d) => d.id === id)!;
    const [x, z] = layout[d.room];
    return [x + d.x, 0.95, z + d.z];
  };
  const previous = trace[Math.max(0, step - 1)],
    current = trace[step];
  const hop = links.find(
    (l) =>
      (l.a === previous && l.b === current) ||
      (l.b === previous && l.a === current),
  );
  const packetPoints =
    current && devices.some((d) => d.id === current)
      ? hop
        ? hop.a === previous
          ? cablePoints(position(hop.a), position(hop.b))
          : cablePoints(position(hop.a), position(hop.b)).reverse()
        : [position(current), position(current)]
      : [];
  return (
    <>
      {trace[step] && devices.some((d) => d.id === trace[step]) && (
        <Packet points={packetPoints} />
      )}
      {connections &&
        links.map((l) => {
          const a = position(l.a),
            b = position(l.b),
            on =
              devices.find((d) => d.id === l.a)!.on &&
              devices.find((d) => d.id === l.b)!.on &&
              configuration(devices.find((d) => d.id === l.a)!).interfaces[l.ap]
                .enabled &&
              configuration(devices.find((d) => d.id === l.b)!).interfaces[l.bp]
                .enabled;
          return (
            <Line
              key={l.id}
              points={cablePoints(a, b)}
              color={
                !on
                  ? "#f75565"
                  : trace.includes(l.a) && trace.includes(l.b)
                    ? "#ffdf65"
                    : l.kind === "Wi-Fi"
                      ? "#29aaff"
                      : "#28cb88"
              }
              lineWidth={2}
            />
          );
        })}
      {devices.map((d) => (
        <group
          key={d.id}
          position={position(d.id)}
          rotation={[0, d.rotation, 0]}
          onPointerDown={(e) => {
            e.stopPropagation();
            select(d.id);
            useNetwork.setState({ dragging: true });
            (
              e.target as unknown as { setPointerCapture: (id: number) => void }
            ).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragging || selected !== d.id) return;
            e.stopPropagation();
            const point = new Vector3();
            if (
              e.ray.intersectPlane(
                new Plane(new Vector3(0, 1, 0), -0.95),
                point,
              )
            ) {
              let room = 0,
                best = Infinity;
              layout.forEach(([x, z], i) => {
                if (!useDesign.getState().rooms.some((r) => r.id === i)) return;
                const distance = (x - point.x) ** 2 + (z - point.z) ** 2;
                if (distance < best) {
                  best = distance;
                  room = i;
                }
              });
              update(d.id, {
                room,
                x: Math.max(-1.8, Math.min(1.8, point.x - layout[room][0])),
                z: Math.max(-1.5, Math.min(1.5, point.z - layout[room][1])),
              });
            }
          }}
          onPointerCancel={() => useNetwork.setState({ dragging: false })}
          onPointerUp={(e) => {
            e.stopPropagation();
            useNetwork.setState({ dragging: false });
            (
              e.target as unknown as {
                releasePointerCapture: (id: number) => void;
              }
            ).releasePointerCapture(e.pointerId);
          }}
          onClick={(e) => {
            e.stopPropagation();
            select(d.id);
          }}
        >
          {d.kind === "Bombilla IoT" && d.on && configuration(d).light && (
            <pointLight color="#ffdb86" intensity={10} distance={4} />
          )}
          <DeviceModel device={d} selected={selected === d.id} />
          <Html position={[0, 0.55, 0]} center distanceFactor={16}>
            <button
              className="device-tag"
              title="Arrastra para mover el dispositivo"
              onPointerDown={(e) => dragLabel(e, d.id)}
              onClick={() => select(d.id)}
            >
              {d.name.length > 20 ? d.kind : d.name}
            </button>
          </Html>
        </group>
      ))}
    </>
  );
}
