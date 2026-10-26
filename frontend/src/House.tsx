import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrbitControls as Controls } from "three-stdlib";
import { useScene } from "./store";
export const rooms = [
  "Sala",
  "Comedor",
  "Cocina",
  "Dormitorio principal",
  "Dormitorio secundario",
  "Oficina",
  "Garaje",
  "Jardín",
  "Telecomunicaciones",
];
function Box({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.65} />
    </mesh>
  );
}
function Scene() {
  const { view, walls, selected, select } = useScene();
  const { camera } = useThree();
  const controls = useRef<Controls>(null);
  useEffect(() => {
    camera.position.set(
      ...((view === "Superior"
        ? [0, 22, 0.01]
        : view === "Interior"
          ? [0, 2.8, 7]
          : [15, 15, 18]) as [number, number, number]),
    );
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [view, camera]);
  return (
    <>
      <color attach="background" args={["#0a1422"]} />
      <ambientLight intensity={1.3} />
      <directionalLight
        position={[8, 18, 6]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Grid
        infiniteGrid
        fadeDistance={45}
        cellColor="#142d43"
        sectionColor="#24405a"
        position={[0, -0.2, 0]}
      />
      {rooms.map((room, i) => {
        const x = ((i % 3) - 1) * 4.2,
          z = (Math.floor(i / 3) - 1) * 3.6;
        return (
          <group key={room} position={[x, 0, z]}>
            <mesh
              receiveShadow
              onClick={(e) => {
                e.stopPropagation();
                select(room);
              }}
            >
              <boxGeometry args={[4, 0.18, 3.4]} />
              <meshStandardMaterial
                color={
                  selected === room
                    ? "#247f95"
                    : i === 7
                      ? "#294c3b"
                      : "#33475a"
                }
              />
            </mesh>
            {walls && (
              <>
                <Box
                  position={[0, 0.85, -1.7]}
                  size={[4, 1.6, 0.12]}
                  color="#8da7b5"
                />
                <Box
                  position={[-2, 0.85, 0]}
                  size={[0.12, 1.6, 3.4]}
                  color="#6d8798"
                />
              </>
            )}
            {i === 0 ? (
              <>
                <Box
                  position={[0, 0.4, -0.5]}
                  size={[2, 0.65, 0.8]}
                  color="#306c83"
                />
                <Box
                  position={[0, 0.27, 0.7]}
                  size={[1.4, 0.4, 0.65]}
                  color="#b89168"
                />
              </>
            ) : i === 7 ? (
              <>
                {[-1, 1].map((n) => (
                  <mesh key={n} position={[n, 0.65, 0]}>
                    <sphereGeometry args={[0.65, 16, 16]} />
                    <meshStandardMaterial color="#3a9969" />
                  </mesh>
                ))}
              </>
            ) : (
              <>
                <Box
                  position={[0.2, 0.4, -0.5]}
                  size={[2, 0.65, 1]}
                  color={i === 3 || i === 4 ? "#7396ba" : "#566f83"}
                />
                <Box
                  position={[0.2, 0.8, -0.5]}
                  size={[1.8, 0.1, 0.85]}
                  color="#b7c8cc"
                />
              </>
            )}
          </group>
        );
      })}
      <OrbitControls
        ref={controls}
        makeDefault
        minDistance={2}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.02}
      />
    </>
  );
}
export default function House() {
  return (
    <Canvas shadows camera={{ position: [15, 15, 18], fov: 45 }} dpr={[1, 1.5]}>
      <Scene />
    </Canvas>
  );
}
