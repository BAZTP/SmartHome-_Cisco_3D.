import { useDesign, roomNames } from "./design";
import InteriorDetails from "./InteriorDetails";
import { Raycaster, Vector2, Plane, Vector3 } from "three";
import { kinds } from "./network";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Html, ContactShadows } from "@react-three/drei";
import { useEffect, useRef } from "react";
import type { OrbitControls as Controls } from "three-stdlib";
import { Floor, Walls, Grounds, layout } from "./Architecture";
import { useNetwork } from "./network";
import NetworkScene from "./NetworkScene";
import Furniture from "./Furniture";
import { useScene } from "./store";
export const rooms = roomNames;
function DropPlacement() {
  const { gl, camera } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("application/x-smarthome-device"))
        e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      const kind = e.dataTransfer?.getData("application/x-smarthome-device");
      if (!kind || !kinds.includes(kind)) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect(),
        ray = new Raycaster(),
        point = new Vector3();
      ray.setFromCamera(
        new Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      if (!ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), point))
        return;
      let room = 0,
        best = Infinity;
      layout.forEach(([x, z], i) => {
        if (!useDesign.getState().rooms.some((r) => r.id === i)) return;
        const d = (x - point.x) ** 2 + (z - point.z) ** 2;
        if (d < best) {
          best = d;
          room = i;
        }
      });
      if (best > 10 || useNetwork.getState().devices.length >= 100) return;
      useNetwork.getState().add(kind, room);
      const state = useNetwork.getState();
      if (state.selected)
        state.update(state.selected, {
          x: Math.max(-1.8, Math.min(1.8, point.x - layout[room][0])),
          z: Math.max(-1.5, Math.min(1.5, point.z - layout[room][1])),
        });
    };
    canvas.addEventListener("dragover", over);
    canvas.addEventListener("drop", drop);
    return () => {
      canvas.removeEventListener("dragover", over);
      canvas.removeEventListener("drop", drop);
    };
  }, [gl, camera]);
  return null;
}
function Scene() {
  const { view, walls, selected, select } = useScene();
  const {
    rooms: activeRooms,
    cameraRevision,
    focusRevision,
    quality,
  } = useDesign();
  const { cameraId, devices, dragging } = useNetwork();
  const cameraDevice = devices.find((d) => d.id === cameraId && d.on);
  const { camera } = useThree();
  const controls = useRef<Controls>(null);
  useEffect(() => {
    camera.position.set(
      ...((view === "Superior"
        ? [0, 22, 0.01]
        : view === "Interior"
          ? [0, 2.8, 7]
          : [0, 16, 14]) as [number, number, number]),
    );

    controls.current?.target.set(0, 0, 0);
    const pose = useDesign.getState().camera;
    if (pose) {
      camera.position.set(...pose.position);
      controls.current?.target.set(...pose.target);
    }
    const device = cameraDevice;
    if (device) {
      const [x, z] = layout[device.room];
      camera.position.set(x + device.x, 1.8, z + device.z);
      controls.current?.target.set(x, 0.5, z - 2);
    }
    controls.current?.update();
  }, [view, camera, cameraRevision, cameraId, cameraDevice]);
  useEffect(() => {
    const focus = useDesign.getState().focus;
    const d = useNetwork.getState().devices.find((d) => d.id === focus);
    if (!d || !controls.current) return;
    useNetwork.setState({ cameraId: null });
    const [x, z] = layout[d.room];
    camera.position.set(x + d.x + 3, 4, z + d.z + 4);
    controls.current.target.set(x + d.x, 0.8, z + d.z);
    controls.current.update();
    useDesign.setState({
      camera: {
        position: camera.position.toArray() as [number, number, number],
        target: controls.current.target.toArray() as [number, number, number],
      },
    });
  }, [focusRevision, camera]);
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
        shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]}
      />
      <hemisphereLight args={["#9cbdd3", "#303721", 0.8]} />
      <DropPlacement />
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
      {activeRooms.map(({ name: room, id: i }) => {
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
            <InteriorDetails room={i} walls={walls} />
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
        onEnd={() => {
          if (cameraId || !controls.current) return;
          useDesign.setState({
            camera: {
              position: camera.position.toArray() as [number, number, number],
              target: controls.current.target.toArray() as [
                number,
                number,
                number,
              ],
            },
          });
        }}
        enabled={!dragging && !cameraId}
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
  const quality = useDesign((s) => s.quality);
  return (
    <Canvas
      shadows
      camera={{ position: [0, 16, 14], fov: 48 }}
      dpr={quality === "high" ? [1, 2] : [1, 1]}
      gl={{ antialias: true }}
    >
      <Scene />
    </Canvas>
  );
}
