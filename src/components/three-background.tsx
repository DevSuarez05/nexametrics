import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { CatmullRomCurve3, Group, Shape, TubeGeometry, Vector3 } from "three";

const emblem = new Shape();
emblem.moveTo(-0.68, -1);
emblem.lineTo(0.68, -1);
emblem.quadraticCurveTo(1, -1, 1, -0.68);
emblem.lineTo(1, 0.68);
emblem.quadraticCurveTo(1, 1, 0.68, 1);
emblem.lineTo(-0.68, 1);
emblem.quadraticCurveTo(-1, 1, -1, 0.68);
emblem.lineTo(-1, -0.68);
emblem.quadraticCurveTo(-1, -1, -0.68, -1);
const marks = [
  [-0.53, -0.41],
  [-0.16, 0.06],
  [0.16, -0.16],
  [0.53, 0.44],
] as const;
const plateOptions = { depth: 0.16, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 };
const colors = ["#35b9a5", "#63cfc0", "#72b6cb", "#35b9a5", "#87d7c5"] as const;

function EmblemCar({ index }: { index: number }) {
  const car = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!car.current) return;
    const t = clock.elapsedTime * 0.52 + index * 2.35;
    const z = ((((t + 17) % 22) + 22) % 22) - 17;
    car.current.position.set(Math.sin(t * 0.26) * 2.25, Math.sin(t * 0.34) * 0.65, z);
    car.current.rotation.set(
      0.34 + Math.sin(t * 0.3) * 0.035,
      Math.sin(t * 0.25) * 0.08,
      Math.sin(t * 0.24) * 0.035,
    );
    car.current.scale.setScalar(0.56 + ((z + 17) / 22) * 0.34);
  });
  return (
    <group ref={car}>
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[2.35, 1.92, 0.15]} />
        <meshStandardMaterial
          color="#123746"
          metalness={0.58}
          roughness={0.29}
          transparent
          opacity={0.78}
        />
      </mesh>
      <mesh>
        <extrudeGeometry args={[emblem, plateOptions]} />
        <meshStandardMaterial
          color={colors[index % colors.length]!}
          metalness={0.52}
          roughness={0.27}
          emissive="#143c40"
          emissiveIntensity={0.22}
        />
      </mesh>
      {marks.map(([x, y], markIndex) => {
        const next = marks[markIndex + 1];
        return (
          <group key={x}>
            <mesh position={[x, y, 0.23]}>
              <sphereGeometry args={[0.14, 12, 10]} />
              <meshStandardMaterial color="#103b4a" metalness={0.42} roughness={0.3} />
            </mesh>
            {next && (
              <mesh
                position={[(x + next[0]) / 2, (y + next[1]) / 2, 0.21]}
                rotation={[0, 0, -Math.atan2(next[0] - x, next[1] - y)]}
              >
                <cylinderGeometry args={[0.055, 0.055, Math.hypot(next[0] - x, next[1] - y), 10]} />
                <meshStandardMaterial color="#103b4a" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function Rails() {
  const sleepers = useRef<Group>(null);
  const railGeometry = useMemo(
    () =>
      [-1, 1].map((side) => {
        const curve = new CatmullRomCurve3([
          new Vector3(side * 0.16, -0.12, -15),
          new Vector3(side * 0.3, -0.23, -8),
          new Vector3(side * 0.85, -0.62, -2),
          new Vector3(side * 3.6, -1.45, 4),
        ]);
        return new TubeGeometry(curve, 40, 0.022, 6, false);
      }),
    [],
  );
  useFrame(({ clock }) => {
    if (!sleepers.current) return;
    const offset = (clock.elapsedTime * 1.8) % 1.12;
    sleepers.current.children.forEach((sleeper, index) => {
      const z = -14 + index * 1.12 + offset;
      const depth = (z + 15) / 19;
      sleeper.position.set(0, -0.12 - depth * 1.3, z);
      sleeper.scale.setScalar(0.28 + depth * 0.95);
    });
  });
  return (
    <group>
      {railGeometry.map((geometry, index) => (
        <mesh key={index} geometry={geometry}>
          <meshStandardMaterial
            color="#57c5b4"
            emissive="#2da895"
            emissiveIntensity={0.7}
            transparent
            opacity={0.66}
          />
        </mesh>
      ))}
      <group ref={sleepers}>
        {Array.from({ length: 16 }, (_, index) => (
          <mesh key={index}>
            <boxGeometry args={[1, 0.055, 0.12]} />
            <meshStandardMaterial
              color="#65cbb9"
              emissive="#287e79"
              emissiveIntensity={0.45}
              transparent
              opacity={0.58}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function MotionScene() {
  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[-4, 6, 8]} intensity={2.6} color="#e8fff9" />
      <pointLight position={[0, -1, 4]} intensity={14} color="#3ed0b5" distance={11} />
      <Rails />
      {Array.from({ length: 6 }, (_, index) => (
        <EmblemCar key={index} index={index} />
      ))}
    </>
  );
}

export default function BrandScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 48 }}
      dpr={[0.7, 1]}
      gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}
    >
      <MotionScene />
    </Canvas>
  );
}
