import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, Html } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrbitControls as Controls } from "three-stdlib";
import Furniture from "./Furniture";
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
          : [0.5, 16, 16]) as [number, number, number]),
    );
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [view, camera]);
  return (
    <>
      <color attach="background" args={["#0a1422"]} />
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[8, 18, 6]}
        intensity={2.2}
        color="#ffdfb1"
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
                      : "#9c8871"
                }
              />
            </mesh>
            {walls && (
              <>
                <Box
                  position={[0, 0.85, -1.7]}
                  size={[4, 1.6, 0.12]}
                  color="#d1c7b4"
                />
                <Box
                  position={[-2, 0.85, 0]}
                  size={[0.12, 1.6, 3.4]}
                  color="#a79f91"
                />
              </>
            )}
            <Furniture room={i} />
            <pointLight
              position={[0, 2, 0]}
              color="#ffcf8b"
              intensity={6}
              distance={5}
            />
            <Html
              position={[0, 0.2, 1.4]}
              center
              distanceFactor={18}
              style={{ pointerEvents: "none" }}
            >
              <span className="room-tag">{room}</span>
            </Html>
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
    <Canvas
      shadows
      camera={{ position: [0.5, 16, 16], fov: 45 }}
      dpr={[1, 1.5]}
    >
      <Scene />
    </Canvas>
  );
}
