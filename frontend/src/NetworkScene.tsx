import DeviceModel from "./DeviceModel";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import type { Mesh } from "three";
import { Plane, Vector3, Raycaster, Vector2 } from "three";
import { configuration } from "./advanced";
import { Html, Line } from "@react-three/drei";
import { useNetwork } from "./network";
import { layout } from "./Architecture";
function Packet({ target }: { target: [number, number, number] }) {
  const ref = useRef<Mesh>(null);
  const initial = useRef(target);
  useFrame((_, delta) => {
    const state = useNetwork.getState();
    if (!ref.current) return;
    const v = new Vector3(...target);
    if (state.playing) ref.current.position.lerp(v, Math.min(1, delta * 7));
    else ref.current.position.copy(v);
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
        const distance = (x - point.x) ** 2 + (z - point.z) ** 2;
        if (distance < best) {
          best = distance;
          room = i;
        }
      });
      useNetwork
        .getState()
        .update(id, {
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
  return (
    <>
      {trace[step] && devices.some((d) => d.id === trace[step]) && (
        <Packet target={position(trace[step])} />
      )}
      {links.map((l) => {
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
            points={[
              a,
              [a[0], 0.2, a[2]],
              [a[0], 0.2, b[2]],
              [b[0], 0.2, b[2]],
              b,
            ]}
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
