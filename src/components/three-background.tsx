import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function SignalRibbon() {
  const group = useRef<THREE.Group>(null);
  const positions = useMemo(() => {
    const vertices: number[] = [];
    const point = (x: number, lane: number) => [
      x,
      Math.sin(x * 1.25 + lane * 0.8) * 0.55 + Math.sin(x * 0.7) * 0.24 + lane * 0.27,
      lane * 0.7,
    ];
    for (let i = 0; i < 36; i++) {
      const lane = (i / 35) * 2 - 1;
      for (let j = 0; j < 100; j++)
        vertices.push(...point(-6 + j * 0.12, lane), ...point(-6 + (j + 1) * 0.12, lane));
    }
    return new Float32Array(vertices);
  }, []);
  useFrame(({ pointer, clock }, delta) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.rotation.x = THREE.MathUtils.damp(
      group.current.rotation.x,
      0.32 + pointer.y * 0.21 + Math.sin(t * 0.4) * 0.08,
      4,
      delta,
    );
    group.current.rotation.y = THREE.MathUtils.damp(
      group.current.rotation.y,
      pointer.x * 0.14,
      4,
      delta,
    );
    group.current.rotation.z = 0.12 + Math.sin(t * 0.28) * 0.025;
  });
  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#55e1c7" transparent opacity={0.74} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

export default function SignalScene() {
  return (
    <div className="signal-canvas absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 40 }}
        dpr={[1, 1.25]}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        fallback={null}
      >
        <SignalRibbon />
      </Canvas>
    </div>
  );
}
