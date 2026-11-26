import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function readColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  try {
    return new THREE.Color(v || fallback)
  } catch {
    return new THREE.Color(fallback)
  }
}

function Particles() {
  const ref = useRef<THREE.Points>(null)
  const { positions, color } = useMemo(() => {
    const count = 900
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 10
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(p) * Math.cos(t)
      arr[i * 3 + 1] = r * Math.sin(p) * Math.sin(t)
      arr[i * 3 + 2] = r * Math.cos(p)
    }
    return { positions: arr, color: readColor('--chart-2', '#3b82f6') }
  }, [])
  useFrame((state, delta) => {
    if (!ref.current) return
    const d = Math.min(delta, 0.05)
    ref.current.rotation.y += d * 0.04
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.15
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={color} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function Knot() {
  const ref = useRef<THREE.Mesh>(null)
  const color = useMemo(() => readColor('--chart-1', '#6366f1'), [])
  useFrame((state, delta) => {
    if (!ref.current) return
    const d = Math.min(delta, 0.05)
    ref.current.rotation.x += d * 0.12
    ref.current.rotation.y += d * 0.18
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3
  })
  return (
    <mesh ref={ref} position={[3.5, 0, -2]}>
      <torusKnotGeometry args={[1.4, 0.35, 160, 16]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.18} />
    </mesh>
  )
}

export default function ThreeBackground() {
  return (
    <Canvas camera={{ position: [0, 0, 9], fov: 55 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <Particles />
      <Knot />
    </Canvas>
  )
}
