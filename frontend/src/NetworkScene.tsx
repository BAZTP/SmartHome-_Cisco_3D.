import { Html, Line } from "@react-three/drei";
import { useNetwork } from "./network";
import { layout } from "./Architecture";
export default function NetworkScene() {
  const { devices, links, selected, select, trace } = useNetwork();
  const position = (id: string): [number, number, number] => {
    const d = devices.find((d) => d.id === id)!;
    const [x, z] = layout[d.room];
    return [x + d.x, 0.95, z + d.z];
  };
  return (
    <>
      {links.map((l) => {
        const a = position(l.a),
          b = position(l.b),
          on =
            devices.find((d) => d.id === l.a)!.on &&
            devices.find((d) => d.id === l.b)!.on;
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
          onClick={(e) => {
            e.stopPropagation();
            select(d.id);
          }}
        >
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.24, 0.4]} />
            <meshStandardMaterial
              color={selected === d.id ? "#27bed7" : "#243944"}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
          {["PC", "Laptop", "Servidor"].includes(d.kind) && (
            <mesh position={[0, 0.28, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.06]} />
              <meshStandardMaterial
                color={d.on ? "#398fa5" : "#18242a"}
                emissive={d.on ? "#103e58" : "#000000"}
              />
            </mesh>
          )}
          <mesh position={[0.22, 0.03, 0.21]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial color={d.on ? "#3affad" : "#ff5163"} />
          </mesh>
          <Html position={[0, 0.55, 0]} center distanceFactor={16}>
            <button className="device-tag" onClick={() => select(d.id)}>
              {d.name.length > 20 ? d.kind : d.name}
            </button>
          </Html>
        </group>
      ))}
    </>
  );
}
