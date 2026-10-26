import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrbitControls as Controls } from "three-stdlib";
import { Floor, Walls, Grounds, layout } from "./Architecture";
import NetworkScene from "./NetworkScene";
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
function Scene() {
  const { view, walls, selected, select } = useScene();
  const { camera, size } = useThree();
  const controls = useRef<Controls>(null);
  useEffect(() => {
    camera.position.set(
      ...((view === "Superior"
        ? [0, 22, 0.01]
        : view === "Interior"
          ? [0, 2.8, 7]
          : [0, 16, 14]) as [number, number, number]),
    );
    if (size.width / size.height < 1.2) camera.position.multiplyScalar(1.25);
    controls.current?.target.set(0, 0, 0);
    controls.current?.update();
  }, [view, camera, size.width, size.height]);
  return (
    <>
      <color attach="background" args={["#0a1422"]} />
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[-5, 12, 8]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
        intensity={2.2}
        color="#ffdfb1"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={["#9cbdd3", "#303721", 0.8]} />
      <Grounds />
      <ContactShadows
        key={String(walls)}
        frames={1}
        position={[0, -0.33, 0]}
        opacity={0.65}
        scale={22}
        blur={2}
        far={5}
        resolution={1024}
      />
      {rooms.map((room, i) => {
        const [x, z] = layout[i];
        return (
          <group key={room} position={[x, 0, z]}>
            <Floor
              room={i}
              selected={selected === room}
              onSelect={() => select(room)}
            />
            {walls && i !== 7 && <Walls />}
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
              distanceFactor={15}
              style={{ pointerEvents: "none" }}
            >
              <span className="room-tag">{room}</span>
            </Html>
          </group>
        );
      })}
      <NetworkScene />
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
      camera={{ position: [0, 16, 14], fov: 48 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
