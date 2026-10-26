type Vec = [number, number, number];
export function Block({ p, s, c }: { p: Vec; s: Vec; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.7} />
    </mesh>
  );
}
function Plant({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <Block p={[0, 0.2, 0]} s={[0.32, 0.4, 0.32]} c="#ac9479" />
      {[0, 1, 2].map((n) => (
        <mesh
          key={n}
          position={[Math.sin(n * 2) * 0.14, 0.55 + n * 0.15, 0]}
          castShadow
        >
          <sphereGeometry args={[0.27, 10, 8]} />
          <meshStandardMaterial color={["#345e39", "#477a43", "#5e8b46"][n]} />
        </mesh>
      ))}
    </group>
  );
}
export default function Furniture({ room }: { room: number }) {
  return (
    <>
      {room !== 7 && <Plant x={1.55} z={-1.2} />}
      {room === 0 && (
        <>
          <Block p={[-1, 0.38, 0]} s={[0.75, 0.55, 2]} c="#a39c8d" />
          <Block p={[-1.36, 0.7, 0]} s={[0.2, 0.6, 2.1]} c="#bbb1a0" />
          <Block p={[0.1, 0.12, 0.1]} s={[1.65, 0.04, 2.2]} c="#72665d" />
          <Block p={[0.2, 0.4, 0.1]} s={[0.8, 0.1, 1.1]} c="#8b6042" />
          <Block p={[1.25, 0.4, 0.2]} s={[0.45, 0.65, 1.6]} c="#573f32" />
          <Block p={[1.25, 1, 0.2]} s={[0.12, 0.8, 1.35]} c="#163849" />
        </>
      )}
      {room === 1 && (
        <>
          <Block p={[0, 0.72, 0]} s={[1.7, 0.13, 1.3]} c="#a67b51" />
          {[-0.65, 0.65].flatMap((x) =>
            [-0.95, 0.95].map((z) => (
              <group key={`${x}${z}`}>
                <Block p={[x, 0.37, z]} s={[0.5, 0.12, 0.5]} c="#bda27e" />
                <Block
                  p={[x, 0.65, z + Math.sign(z) * 0.2]}
                  s={[0.5, 0.55, 0.08]}
                  c="#8d7254"
                />
              </group>
            )),
          )}
          <Block p={[0, 0.35, 0]} s={[0.8, 0.7, 0.6]} c="#594a3e" />
        </>
      )}
      {room === 2 && (
        <>
          {[-1.3, -0.5, 0.3, 1.1].map((x) => (
            <group key={x}>
              <Block p={[x, 0.45, -1]} s={[0.78, 0.8, 0.7]} c="#c2c0ad" />
              <Block p={[x, 0.9, -1]} s={[0.8, 0.08, 0.75]} c="#e3dfcc" />
            </group>
          ))}
          <Block p={[-1.3, 0.85, 0.7]} s={[0.8, 1.6, 0.8]} c="#a3adb1" />
          <Block p={[0.35, 0.96, -1]} s={[0.55, 0.03, 0.5]} c="#202d33" />
        </>
      )}
      {(room === 3 || room === 4) && (
        <>
          <Block p={[0, 0.26, 0]} s={[1.9, 0.4, 2.4]} c="#685141" />
          <Block p={[0, 0.52, 0]} s={[1.85, 0.3, 2.25]} c="#e3ddd1" />
          <Block
            p={[0, 0.7, 0.4]}
            s={[1.9, 0.1, 1.5]}
            c={room === 3 ? "#365e72" : "#76868d"}
          />
          {[-0.48, 0.48].map((x) => (
            <Block
              key={x}
              p={[x, 0.75, -0.75]}
              s={[0.7, 0.18, 0.5]}
              c="#ece8da"
            />
          ))}
          <Block p={[0, 0.85, -1.25]} s={[2, 1.3, 0.16]} c="#806950" />
          <Block p={[-1.4, 0.35, -0.8]} s={[0.55, 0.65, 0.65]} c="#947552" />
        </>
      )}
      {room === 5 && (
        <>
          <Block p={[0, 0.8, -0.65]} s={[2.5, 0.15, 1]} c="#a47951" />
          <Block p={[0, 0.4, -0.65]} s={[0.25, 0.8, 0.6]} c="#293c43" />
          <Block p={[0, 1.2, -0.8]} s={[1, 0.65, 0.09]} c="#122a3b" />
          <Block p={[0, 0.55, 0.5]} s={[0.65, 0.15, 0.65]} c="#263d48" />
          <Block p={[0, 0.9, 0.8]} s={[0.65, 0.7, 0.12]} c="#344f5c" />
        </>
      )}
      {room === 6 && (
        <>
          <Block p={[0, 0.5, 0]} s={[1.6, 0.65, 2.7]} c="#7c8b91" />
          <Block p={[0, 1, -0.2]} s={[1.35, 0.5, 1.4]} c="#3c515e" />
          {[-0.85, 0.85].flatMap((x) =>
            [-0.85, 0.85].map((z) => (
              <mesh
                key={`${x}${z}`}
                position={[x, 0.35, z]}
                rotation={[0, 0, Math.PI / 2]}
              >
                <cylinderGeometry args={[0.3, 0.3, 0.18, 16]} />
                <meshStandardMaterial color="#172028" />
              </mesh>
            )),
          )}
        </>
      )}
      {room === 7 && (
        <>
          {[-1.4, 1.4].flatMap((x) =>
            [-1, 1].map((z) => <Plant key={`${x}${z}`} x={x} z={z} />),
          )}
          {[-1, -0.3, 0.4, 1.1].map((z) => (
            <Block key={z} p={[0, 0.12, z]} s={[0.9, 0.1, 0.45]} c="#929b91" />
          ))}
        </>
      )}
      {room === 8 && (
        <>
          {[-0.8, 0.8].map((x) => (
            <group key={x}>
              <Block p={[x, 0.9, -0.7]} s={[0.9, 1.7, 0.8]} c="#172c36" />
              {[0.3, 0.6, 0.9, 1.2, 1.5].map((y) => (
                <group key={y}>
                  <Block p={[x, y, -0.25]} s={[0.75, 0.19, 0.04]} c="#50616a" />
                  <mesh position={[x + 0.25, y, -0.21]}>
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshStandardMaterial
                      color="#4fe4bb"
                      emissive="#29a889"
                      emissiveIntensity={2}
                    />
                  </mesh>
                </group>
              ))}
            </group>
          ))}
        </>
      )}
    </>
  );
}
