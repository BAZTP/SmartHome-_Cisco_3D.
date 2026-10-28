import { RoundedBox } from "@react-three/drei";
import { useMemo, useEffect } from "react";
import { CanvasTexture, SRGBColorSpace } from "three";
import { Block } from "./Furniture";
function ScreenArt() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;
    const sky = ctx.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, "#082e52");
    sky.addColorStop(0.6, "#24aaca");
    sky.addColorStop(1, "#d7bc81");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 256);
    for (let j = 0; j < 3; j++) {
      ctx.fillStyle = ["#367a94", "#205270", "#123d53"][j];
      ctx.beginPath();
      ctx.moveTo(0, 256);
      for (let i = 0; i < 9; i++)
        ctx.lineTo(i * 70, 120 + j * 35 - Math.sin(i * 2.4 + j) * 40);
      ctx.lineTo(512, 256);
      ctx.fill();
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[1.177, 1, 0.2]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[1.22, 0.67]} />
      <meshStandardMaterial
        map={texture}
        emissiveMap={texture}
        emissive="#ffffff"
        emissiveIntensity={0.7}
      />
    </mesh>
  );
}
function Lamp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.74, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.8, 12]} />
        <meshStandardMaterial
          color="#d2b783"
          metalness={0.7}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <coneGeometry args={[0.22, 0.32, 24, 1, true]} />
        <meshStandardMaterial
          color="#fff0d5"
          emissive="#ffbb65"
          emissiveIntensity={0.5}
          side={2}
        />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 20]} />
        <meshStandardMaterial color="#695b45" />
      </mesh>
    </group>
  );
}
export default function InteriorDetails({
  room,
  walls,
}: {
  room: number;
  walls: boolean;
}) {
  return (
    <group>
      {walls && room !== 7 && (
        <>
          <group position={[-2, 0, 0.58]} rotation={[0, -0.65, 0]}>
            <Block p={[0.34, 0.75, 0]} s={[0.68, 1.4, 0.055]} c="#967451" />
            <mesh position={[0.58, 0.7, 0.045]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshStandardMaterial
                color="#d8c38e"
                metalness={0.9}
                roughness={0.15}
              />
            </mesh>
          </group>
          <Block p={[-1.94, 0.18, -0.6]} s={[0.035, 0.14, 2.25]} c="#e2d8bc" />
          {[-0.2, 1.3].map((x) => (
            <group key={x}>
              <Block p={[x, 1, -1.59]} s={[0.16, 0.8, 0.07]} c="#d0c4b0" />
              <Block p={[x, 1.42, -1.6]} s={[0.22, 0.06, 0.09]} c="#eee1ca" />
            </group>
          ))}
        </>
      )}
      {room === 0 && (
        <>
          <ScreenArt />
          {[-0.7, 0, 0.7].map((z) => (
            <RoundedBox
              key={z}
              args={[0.56, 0.16, 0.57]}
              radius={0.07}
              smoothness={3}
              position={[-0.96, 0.7, z]}
            >
              <meshStandardMaterial color="#d0c5b3" roughness={0.9} />
            </RoundedBox>
          ))}
          <RoundedBox
            args={[0.18, 0.36, 0.42]}
            radius={0.06}
            position={[-1.12, 0.9, -0.5]}
          >
            <meshStandardMaterial color="#537584" />
          </RoundedBox>
          <Lamp x={-1.4} z={-1.15} />
          <mesh position={[0.2, 0.48, 0.1]}>
            <cylinderGeometry args={[0.18, 0.2, 0.05, 24]} />
            <meshStandardMaterial color="#eee8d6" />
          </mesh>
        </>
      )}
      {room === 1 && (
        <>
          {[-0.65, 0.65].flatMap((x) =>
            [-0.95, 0.95].flatMap((z) =>
              [-0.16, 0.16].map((dx) => (
                <Block
                  key={`${x}/${z}/${dx}`}
                  p={[x + dx, 0.2, z]}
                  s={[0.04, 0.3, 0.38]}
                  c="#403931"
                />
              )),
            ),
          )}
          {[-0.5, 0.5].flatMap((x) =>
            [-0.35, 0.35].map((z) => (
              <mesh key={`${x}/${z}`} position={[x, 0.81, z]}>
                <cylinderGeometry args={[0.16, 0.16, 0.018, 24]} />
                <meshStandardMaterial color="#f2ead6" />
              </mesh>
            )),
          )}
          <mesh position={[0, 0.91, 0]}>
            <sphereGeometry args={[0.13, 16, 12]} />
            <meshStandardMaterial color="#67935d" />
          </mesh>
        </>
      )}
      {room === 2 && (
        <>
          {[-1.3, -0.5, 0.3, 1.1].map((x) => (
            <group key={x}>
              <Block
                p={[x, 0.7, -0.637]}
                s={[0.28, 0.035, 0.025]}
                c="#717b7e"
              />
              {walls && (
                <Block p={[x, 1.35, -1.55]} s={[0.75, 0.6, 0.45]} c="#a99579" />
              )}
            </group>
          ))}
          {[0.17, 0.53].flatMap((x) =>
            [-1.15, -0.85].map((z) => (
              <mesh
                key={`${x}/${z}`}
                position={[x, 0.983, z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <ringGeometry args={[0.065, 0.085, 20]} />
                <meshStandardMaterial color="#c2c6c0" metalness={0.6} />
              </mesh>
            )),
          )}
          <Block p={[-1.3, 0.8, 1.12]} s={[0.66, 0.02, 0.02]} c="#3e505c" />
        </>
      )}
      {(room === 3 || room === 4) && (
        <>
          <Lamp x={-1.4} z={-0.8} />
          {[
            -0.85, -0.65, -0.45, -0.25, -0.05, 0.15, 0.35, 0.55, 0.75, 0.85,
          ].map((x) => (
            <Block
              key={x}
              p={[x, 0.76, 0.4]}
              s={[0.015, 0.015, 1.45]}
              c={room === 3 ? "#7296a3" : "#b0bec4"}
            />
          ))}
          <Block p={[1.5, 0.65, 0.4]} s={[0.65, 1.1, 1.4]} c="#ac967b" />
          {[-0.1, 0.5, 0.95].map((z) => (
            <Block
              key={z}
              p={[1.14, 0.65, z]}
              s={[0.02, 0.85, 0.015]}
              c="#72634f"
            />
          ))}
        </>
      )}
      {room === 5 && (
        <>
          {[-1, 1].map((x) => (
            <Block
              key={x}
              p={[x, 0.4, -0.7]}
              s={[0.06, 0.7, 0.65]}
              c="#34424a"
            />
          ))}
          <Block p={[0, 0.9, -0.35]} s={[0.6, 0.035, 0.25]} c="#283c47" />
          <Lamp x={1} z={-0.8} />
          <Block p={[-1.55, 0.7, -1.2]} s={[0.55, 1.2, 0.4]} c="#846d51" />
          {[0.4, 0.8, 1.1].map((y) => (
            <Block
              key={y}
              p={[-1.55, y, -0.96]}
              s={[0.45, 0.09, 0.2]}
              c="#b3bdaf"
            />
          ))}
        </>
      )}
      {room === 6 && (
        <>
          {[-0.58, 0.58].map((x) => (
            <group key={x}>
              <Block p={[x, 0.58, 1.37]} s={[0.3, 0.12, 0.035]} c="#dfeddf" />
              <Block p={[x, 0.58, -1.37]} s={[0.3, 0.1, 0.035]} c="#9f333d" />
            </group>
          ))}
          <Block p={[0, 0.45, 1.4]} s={[0.8, 0.12, 0.04]} c="#243d48" />
          {[-1.65, 1.65].map((x) => (
            <Block
              key={x}
              p={[x, 0.12, 0]}
              s={[0.025, 0.01, 2.8]}
              c="#c5c2a6"
            />
          ))}
        </>
      )}
      {room === 7 && (
        <>
          {[-1.1, 1.1].map((x) => (
            <group key={x}>
              <Block p={[x, 0.35, -0.2]} s={[0.4, 0.08, 1.2]} c="#ad8b58" />
              {[-0.65, 0.25].map((z) => (
                <Block
                  key={z}
                  p={[x, 0.2, z]}
                  s={[0.35, 0.3, 0.06]}
                  c="#344137"
                />
              ))}
            </group>
          ))}
          <Block p={[0, 0.18, 1.72]} s={[3.8, 0.25, 0.1]} c="#525d4c" />
        </>
      )}
    </group>
  );
}
