import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { Block } from "./Furniture";
export const layout: [number, number][] = [
  [-4.2, -3.8],
  [0, -3.8],
  [4.2, -3.8],
  [-4.2, 0],
  [4.2, 0],
  [4.2, 3.8],
  [-4.2, 3.8],
  [0, 3.8],
  [0, 0],
];
function makeFloor(tile: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext("2d")!;
  let seed = 41;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  c.fillStyle = tile ? "#a9ada7" : "#9b7955";
  c.fillRect(0, 0, 512, 512);
  if (tile) {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const shade = 150 + Math.floor(random() * 25);
        c.fillStyle = `rgb(${shade + 12},${shade + 10},${shade + 4})`;
        c.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
      }
  } else {
    for (let y = 0; y < 16; y++) {
      const shade = 95 + Math.floor(random() * 40);
      c.fillStyle = `rgb(${shade + 48},${shade + 23},${shade})`;
      c.fillRect(0, y * 32, 512, 31);
      for (let n = 0; n < 30; n++) {
        c.strokeStyle = `rgba(50,25,8,${random() * 0.16})`;
        c.beginPath();
        const py = y * 32 + random() * 30;
        c.moveTo(0, py);
        c.bezierCurveTo(180, py + 3, 350, py - 3, 512, py);
        c.stroke();
      }
      c.fillStyle = "#44332488";
      c.fillRect((y % 3) * 160, y * 32, 1, 32);
    }
  }
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
export function Floor({
  room,
  selected,
  onSelect,
}: {
  room: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const texture = useMemo(() => makeFloor([2, 6, 8].includes(room)), [room]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group>
      <mesh
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.11, 0]}
      >
        <planeGeometry args={[4.08, 3.65]} />
        <meshStandardMaterial
          map={texture}
          color={selected ? "#b8e9ed" : room === 7 ? "#496440" : "#ffffff"}
          roughness={0.8}
        />
      </mesh>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.125, 0]}>
          <ringGeometry args={[0.15, 0.24, 32]} />
          <meshBasicMaterial color="#53e4ee" />
        </mesh>
      )}
    </group>
  );
}
export function Walls() {
  return (
    <group>
      <Block p={[0, 0.8, -1.85]} s={[4.2, 1.6, 0.14]} c="#d9d3bd" />
      <Block p={[-2.05, 0.8, -0.65]} s={[0.14, 1.6, 2.45]} c="#c6c2ae" />
      <Block p={[-2.05, 0.8, 1.6]} s={[0.14, 1.6, 0.4]} c="#c6c2ae" />
      <Block p={[-2.05, 1.5, 0.95]} s={[0.2, 0.2, 0.95]} c="#b1a48d" />
      <Block p={[0, 0.19, -1.75]} s={[4, 0.14, 0.06]} c="#eee4cd" />
      <Block p={[0, 1.6, -1.85]} s={[4.2, 0.08, 0.22]} c="#e8e2cf" />
      <Block p={[0.55, 1, -1.755]} s={[1.25, 0.72, 0.04]} c="#324c59" />
      {[-0.12, 0.55, 1.22].map((x) => (
        <Block key={x} p={[x, 1, -1.7]} s={[0.045, 0.8, 0.05]} c="#d5d0ba" />
      ))}
      {[0.6, 1.4].map((y) => (
        <Block key={y} p={[0.55, y, -1.7]} s={[1.4, 0.045, 0.05]} c="#ddd5bf" />
      ))}
      {[-1.6, 1.6].map((x) => (
        <group key={x}>
          <Block p={[x, 1.15, -1.7]} s={[0.13, 0.35, 0.12]} c="#443b31" />
          <mesh position={[x, 1.15, -1.62]}>
            <boxGeometry args={[0.08, 0.24, 0.02]} />
            <meshStandardMaterial
              color="#fff0bd"
              emissive="#ffb65f"
              emissiveIntensity={2}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function Tree({ x, z, n }: { x: number; z: number; n: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.13, 1.2, 7]} />
        <meshStandardMaterial color="#5d4830" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * 3 + n) * 0.22,
            1 + i * 0.3,
            Math.cos(i * 4) * 0.18,
          ]}
          castShadow
        >
          <icosahedronGeometry args={[0.55 - i * 0.09, 1]} />
          <meshStandardMaterial
            color={["#234837", "#345e3c", "#487046"][i]}
            roughness={1}
          />
        </mesh>
      ))}
    </group>
  );
}
export function Grounds() {
  return (
    <>
      <Block p={[0, -0.16, 0]} s={[15.5, 0.3, 14.3]} c="#243a2e" />
      <Block p={[0, -0.02, -0.05]} s={[12.7, 0.2, 11.4]} c="#726e63" />
      <Block p={[0, -0.07, 6.35]} s={[15.5, 0.12, 1.4]} c="#7c817b" />
      {Array.from({ length: 16 }, (_, i) => (
        <Block
          key={i}
          p={[-7.4 + i, 0.005, 6.35]}
          s={[0.015, 0.012, 1.4]}
          c="#4a514e"
        />
      ))}
      {[-7, 7].flatMap((x) =>
        Array.from({ length: 8 }, (_, i) => (
          <Tree key={`${x}/${i}`} x={x} z={-5.8 + i * 1.5} n={i} />
        )),
      )}
      {Array.from({ length: 9 }, (_, i) => (
        <Tree key={i} x={-6 + i * 1.5} z={-6.4} n={i} />
      ))}
      {[-6.6, 6.6].flatMap((x) =>
        [-4, -1, 2, 5].map((z) => (
          <group key={`${x}/${z}`}>
            <Block p={[x, 0.25, z]} s={[0.1, 0.5, 0.1]} c="#162123" />
            <mesh position={[x, 0.55, z]}>
              <boxGeometry args={[0.18, 0.1, 0.18]} />
              <meshStandardMaterial
                color="#ffefb9"
                emissive="#ffcb78"
                emissiveIntensity={3}
              />
            </mesh>
          </group>
        )),
      )}
      {[-6.7, 6.7].map((x) => (
        <Block key={x} p={[x, 0.18, 0]} s={[0.12, 0.4, 11.8]} c="#85897d" />
      ))}
    </>
  );
}
