import ImportedModel from "./ImportedModel";
import { useModels } from "./models";
import type { Device } from "./network";
import { configuration } from "./advanced";
/** Original procedural educational models. No proprietary assets. */
export default function DeviceModel({
  device: d,
  selected,
}: {
  device: Device;
  selected: boolean;
}) {
  const models = useModels();
  const custom = models.assets[models.devices[d.id]];
  if (custom) return <ImportedModel asset={custom} />;
  const body = selected ? "#30a8bc" : "#314650",
    screen = d.on ? "#268ac2" : "#101a25";
  const box = (
    size: [number, number, number],
    position: [number, number, number],
    color = body,
  ) => (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.38} metalness={0.3} />
    </mesh>
  );
  if (d.kind === "Internet")
    return (
      <group>
        {[-0.22, 0, 0.22].map((x, i) => (
          <mesh key={i} position={[x, i === 1 ? 0.18 : 0, 0]}>
            <sphereGeometry args={[0.28, 20, 12]} />
            <meshStandardMaterial
              color="#36bfe9"
              emissive="#08799f"
              emissiveIntensity={d.on ? 0.7 : 0}
            />
          </mesh>
        ))}
      </group>
    );
  if (d.kind === "Cámara IP")
    return (
      <group>
        {box([0.12, 0.34, 0.12], [0, -0.12, 0])}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.21, 0.21, 0.4, 20]} />
          <meshStandardMaterial color="#dae2e5" />
        </mesh>
        <mesh position={[0, 0, 0.22]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial
            color="#10232f"
            metalness={0.8}
            roughness={0.15}
          />
        </mesh>
      </group>
    );
  if (d.kind === "Bombilla IoT")
    return (
      <group>
        {box([0.18, 0.14, 0.18], [0, -0.1, 0], "#82949b")}
        <mesh position={[0, 0.13, 0]}>
          <sphereGeometry args={[0.23, 20, 16]} />
          <meshStandardMaterial
            color="#f0e8c7"
            emissive="#ffcf61"
            emissiveIntensity={d.on && configuration(d).light ? 2 : 0}
          />
        </mesh>
      </group>
    );
  if (d.kind === "Access Point")
    return (
      <mesh>
        <cylinderGeometry args={[0.35, 0.35, 0.13, 24]} />
        <meshStandardMaterial color={selected ? body : "#e3e7e8"} />
      </mesh>
    );
  if (d.kind === "Sensor IoT")
    return (
      <group>
        {box([0.24, 0.32, 0.14], [0, 0, 0], "#d7e5e5")}
        <mesh position={[0, 0, 0.09]}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <meshStandardMaterial color={screen} />
        </mesh>
      </group>
    );
  if (["PC", "Laptop", "Smart TV"].includes(d.kind))
    return (
      <group>
        {box([0.65, 0.07, 0.4], [0, -0.1, 0])}
        {box([d.kind === "Smart TV" ? 0.9 : 0.65, 0.4, 0.07], [0, 0.2, -0.12])}
        {box(
          [d.kind === "Smart TV" ? 0.81 : 0.56, 0.31, 0.015],
          [0, 0.2, -0.075],
          screen,
        )}
        {d.kind === "PC" && box([0.2, 0.5, 0.32], [0.48, 0.12, 0])}
      </group>
    );
  if (d.kind === "Impresora")
    return (
      <group>
        {box([0.6, 0.28, 0.44], [0, 0, 0], "#b8c6ca")}
        {box([0.42, 0.02, 0.28], [0, 0.15, 0.14], "#f3f0e8")}
      </group>
    );
  if (d.kind === "Teléfono IP")
    return (
      <group>
        {box([0.3, 0.08, 0.4], [0, 0, 0])}
        {box([0.22, 0.08, 0.12], [0, 0.08, -0.08], screen)}
        {box([0.1, 0.12, 0.36], [-0.18, 0.08, 0], "#182b34")}
      </group>
    );
  if (d.kind === "Servidor")
    return (
      <group>
        {box([0.4, 0.7, 0.4], [0, 0.2, 0])}
        {[0, 1, 2, 3].map((i) => (
          <group key={i}>
            {box([0.32, 0.065, 0.015], [0, i * 0.14 - 0.04, 0.21], "#0b1925")}
          </group>
        ))}
      </group>
    );
  return (
    <group>
      {box(
        [0.8, 0.22, 0.44],
        [0, 0, 0],
        d.kind === "Firewall ASA" ? "#713a43" : body,
      )}
      {Array.from({ length: d.kind.startsWith("Switch") ? 8 : 4 }, (_, i) => (
        <group key={i}>
          {box([0.055, 0.06, 0.02], [-0.3 + i * 0.085, 0, 0.23], "#07161d")}
          <mesh position={[-0.3 + i * 0.085, 0.065, 0.24]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshBasicMaterial color={d.on ? "#30eaa7" : "#aa4252"} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
