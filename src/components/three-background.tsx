import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  NormalBlending,
  PlaneGeometry,
  ShaderMaterial,
  type IUniform,
} from 'three'

/*
 * Fondo "red neuronal": nodos que flotan, enlaces que se encienden cuando dos nodos se acercan,
 * pulsos de datos que recorren los enlaces y una cuadrícula tipo circuito que se pierde en la niebla.
 * Todo el movimiento ocurre en los shaders: useFrame solo actualiza un puñado de números (sin asignar memoria).
 */

const LINK_DIST = 2.1
const MAX_LINKS_PER_NODE = 3
const PARALLAX = (5 * Math.PI) / 180 // ±5°

const PALETTES = {
  dark: { a: '#20c6a5', b: '#7ff5dc', c: '#7ea1e0', intensity: 1.35, core: 0.8, blending: AdditiveBlending },
  light: { a: '#11917a', b: '#0d6f5f', c: '#3e64a8', intensity: 0.75, core: 0, blending: NormalBlending },
} as const

// Generador pseudoaleatorio con semilla: la red es la misma en cada carga.
function random(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildNetwork(count: number) {
  const rand = random(20260)
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5
  const hubs = Array.from({ length: 9 }, () => [rand() * 30 - 15, rand() * 12 - 4, -rand() * 13] as const)

  const pos = new Float32Array(count * 3)
  const phase = new Float32Array(count)
  const size = new Float32Array(count)
  const tint = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const hub = hubs[i % hubs.length]!
    const clustered = rand() < 0.62
    pos[i * 3] = clustered ? hub[0] + gauss() * 3.2 : rand() * 36 - 18
    pos[i * 3 + 1] = clustered ? hub[1] + gauss() * 2.2 : rand() * 17 - 7
    pos[i * 3 + 2] = clustered ? hub[2] + gauss() * 2.6 : -rand() * 16 + 1.5
    phase[i] = rand() * Math.PI * 2
    size[i] = 1.4 + rand() ** 3 * 4.2
    tint[i] = rand() < 0.18 ? 1 : 0
  }

  // Enlaces entre vecinos cercanos, con una rejilla espacial para no comparar todos contra todos.
  const cells = new Map<string, number[]>()
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`
  const cellOf = (i: number) => [0, 1, 2].map((k) => Math.floor(pos[i * 3 + k]! / LINK_DIST)) as [number, number, number]
  for (let i = 0; i < count; i++) {
    const k = key(...cellOf(i))
    const list = cells.get(k)
    if (list) list.push(i)
    else cells.set(k, [i])
  }
  const degree = new Uint8Array(count)
  const links: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const [cx, cy, cz] = cellOf(i)
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++)
          for (const j of cells.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
            if (j <= i || degree[i]! >= MAX_LINKS_PER_NODE || degree[j]! >= MAX_LINKS_PER_NODE) continue
            const d = Math.hypot(
              pos[i * 3]! - pos[j * 3]!,
              pos[i * 3 + 1]! - pos[j * 3 + 1]!,
              pos[i * 3 + 2]! - pos[j * 3 + 2]!,
            )
            if (d < LINK_DIST * 1.2) {
              links.push([i, j])
              degree[i]! += 1
              degree[j]! += 1
            }
          }
  }

  const nodes = new BufferGeometry()
  nodes.setAttribute('position', new BufferAttribute(pos, 3))
  nodes.setAttribute('aPhase', new BufferAttribute(phase, 1))
  nodes.setAttribute('aSize', new BufferAttribute(size, 1))
  nodes.setAttribute('aTint', new BufferAttribute(tint, 1))

  // Cada vértice de un enlace conoce el otro extremo para medir la distancia en el shader.
  const edgeAttrs = (pairs: [number, number][], both: boolean) => {
    const n = pairs.length * (both ? 2 : 1)
    const own = new Float32Array(n * 3)
    const other = new Float32Array(n * 3)
    const ownPhase = new Float32Array(n)
    const otherPhase = new Float32Array(n)
    let v = 0
    for (const [i, j] of pairs) {
      for (const [a, b] of both ? [[i, j], [j, i]] : [[i, j]]) {
        own.set(pos.subarray(a! * 3, a! * 3 + 3), v * 3)
        other.set(pos.subarray(b! * 3, b! * 3 + 3), v * 3)
        ownPhase[v] = phase[a!]!
        otherPhase[v] = phase[b!]!
        v++
      }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(own, 3))
    geometry.setAttribute('aPhase', new BufferAttribute(ownPhase, 1))
    geometry.setAttribute('aOther', new BufferAttribute(other, 3))
    geometry.setAttribute('aOtherPhase', new BufferAttribute(otherPhase, 1))
    return geometry
  }
  const lines = edgeAttrs(links, true)

  const pulsePairs = links.filter(() => rand() < 0.12).map(([i, j]) => (rand() < 0.5 ? [i, j] : [j, i]) as [number, number])
  const pulses = edgeAttrs(pulsePairs, false)
  const offset = new Float32Array(pulsePairs.length)
  const speed = new Float32Array(pulsePairs.length)
  for (let i = 0; i < pulsePairs.length; i++) {
    offset[i] = rand()
    speed[i] = 0.12 + rand() * 0.35
  }
  pulses.setAttribute('aOffset', new BufferAttribute(offset, 1))
  pulses.setAttribute('aSpeed', new BufferAttribute(speed, 1))

  return { nodes, lines, pulses }
}

const COMMON = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  vec3 drift(vec3 p, float ph) {
    return p + vec3(sin(uTime * .16 + ph) * .38, cos(uTime * .13 + ph * 1.3) * .38, sin(uTime * .11 + ph * .7) * .32);
  }
  float sweep(vec3 p) { return .5 + .5 * sin(p.x * .32 + p.y * .12 - uTime * .85); }
  float depthFade(float z) { return mix(.12, 1., smoothstep(-30., -8., z)); }
`
const GLOW = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uColorC;
  uniform float uIntensity;
  uniform float uCore;
  vec4 glow(vec3 color, float alpha) {
    float d = length(gl_PointCoord - .5);
    float halo = smoothstep(.5, 0., d);
    float core = smoothstep(.14, 0., d);
    return vec4(color + core * uCore, halo * halo * alpha * uIntensity);
  }
`

const NODE_VS = /* glsl */ `${COMMON}
  attribute float aPhase; attribute float aSize; attribute float aTint;
  varying float vAlpha; varying float vTint;
  void main() {
    vec3 p = drift(position, aPhase);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    float s = sweep(p);
    float twinkle = .65 + .35 * sin(uTime * 1.6 + aPhase * 5.);
    vAlpha = (.3 + .7 * s * twinkle) * depthFade(mv.z);
    vTint = aTint;
    gl_PointSize = aSize * uPixelRatio * (1. + .7 * s) * (17. / -mv.z);
  }`
const NODE_FS = /* glsl */ `${GLOW}
  varying float vAlpha; varying float vTint;
  void main() { gl_FragColor = glow(mix(uColorA, uColorC, vTint), vAlpha); }`

const LINE_VS = /* glsl */ `${COMMON}
  uniform float uLinkDist;
  attribute float aPhase; attribute vec3 aOther; attribute float aOtherPhase;
  varying float vAlpha;
  void main() {
    vec3 a = drift(position, aPhase);
    vec3 b = drift(aOther, aOtherPhase);
    vec4 mv = modelViewMatrix * vec4(a, 1.);
    gl_Position = projectionMatrix * mv;
    float near = smoothstep(uLinkDist * 1.2, uLinkDist * .5, distance(a, b));
    vAlpha = near * (.06 + .42 * sweep(a)) * depthFade(mv.z);
  }`
const LINE_FS = /* glsl */ `
  uniform vec3 uColorA; uniform float uIntensity;
  varying float vAlpha;
  void main() { gl_FragColor = vec4(uColorA, vAlpha * uIntensity); }`

const PULSE_VS = /* glsl */ `${COMMON}
  attribute float aPhase; attribute vec3 aOther; attribute float aOtherPhase; attribute float aOffset; attribute float aSpeed;
  varying float vAlpha;
  void main() {
    float t = fract(uTime * aSpeed + aOffset);
    vec3 p = mix(drift(position, aPhase), drift(aOther, aOtherPhase), t);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    vAlpha = sin(t * 3.14159) * depthFade(mv.z);
    gl_PointSize = 5.5 * uPixelRatio * (17. / -mv.z);
  }`
const PULSE_FS = /* glsl */ `${GLOW}
  varying float vAlpha;
  void main() { gl_FragColor = glow(uColorB, vAlpha * 1.3); }`

const GRID_VS = /* glsl */ `
  varying vec3 vWorld; varying float vDist;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`
const GRID_FS = /* glsl */ `
  uniform float uTime; uniform float uScroll;
  uniform vec3 uColorA; uniform vec3 uColorB; uniform float uIntensity;
  varying vec3 vWorld; varying float vDist;
  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
  void main() {
    vec2 c = vec2(vWorld.x, vWorld.z + uTime * .7 + uScroll) / 1.7;
    vec2 g = abs(fract(c - .5) - .5) / fwidth(c);
    float line = 1. - min(min(g.x, g.y), 1.);
    float column = floor(c.x + .5);
    float h = hash(column);
    float lane = (1. - min(g.x, 1.)) * step(.72, h);
    float trace = lane * pow(fract(c.y * .06 - uTime * (.12 + h * .25) + h * 9.), 14.);
    float fog = smoothstep(58., 9., vDist) * smoothstep(46., 12., abs(vWorld.x));
    float alpha = (line * .2 + lane * .12 + trace) * fog;
    gl_FragColor = vec4(mix(uColorA, uColorB, trace), alpha * uIntensity);
  }`

function Network({ dark }: { dark: boolean }) {
  const group = useRef<Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const { gl } = useThree()

  const count = useMemo(() => (window.innerWidth >= 1440 ? 2400 : 1200), [])
  const geometry = useMemo(() => buildNetwork(count), [count])
  const grid = useMemo(() => new PlaneGeometry(120, 80, 1, 1), [])
  const shared = useMemo(
    () => ({ uTime: { value: 0 }, uScroll: { value: 0 }, uPixelRatio: { value: 1 }, uLinkDist: { value: LINK_DIST } }),
    [],
  )

  const materials = useMemo(() => {
    const p = PALETTES[dark ? 'dark' : 'light']
    const uniforms: Record<string, IUniform> = {
      ...shared,
      uColorA: { value: new Color(p.a) },
      uColorB: { value: new Color(p.b) },
      uColorC: { value: new Color(p.c) },
      uIntensity: { value: p.intensity },
      uCore: { value: p.core },
    }
    const make = (vertexShader: string, fragmentShader: string) =>
      new ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, depthWrite: false, blending: p.blending })
    return {
      nodes: make(NODE_VS, NODE_FS),
      lines: make(LINE_VS, LINE_FS),
      pulses: make(PULSE_VS, PULSE_FS),
      grid: make(GRID_VS, GRID_FS),
    }
  }, [dark, shared])

  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials])
  useEffect(
    () => () => {
      Object.values(geometry).forEach((g) => g.dispose())
      grid.dispose()
    },
    [geometry, grid],
  )

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame((state, delta) => {
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 2.5)
    const scroll = window.scrollY
    shared.uTime.value = state.clock.elapsedTime
    shared.uPixelRatio.value = gl.getPixelRatio()
    shared.uScroll.value += (scroll * 0.012 - shared.uScroll.value) * ease
    const g = group.current
    if (!g) return
    g.rotation.y += (pointer.current.x * PARALLAX - g.rotation.y) * ease
    g.rotation.x += (pointer.current.y * PARALLAX * 0.6 - g.rotation.x) * ease
    g.position.y += (Math.min(scroll * 0.0025, 3) - g.position.y) * ease
  })

  return (
    <group ref={group}>
      <mesh geometry={grid} material={materials.grid} rotation={[-Math.PI / 2, 0, 0]} position={[0, -6.5, -22]} frustumCulled={false} />
      <lineSegments geometry={geometry.lines} material={materials.lines} frustumCulled={false} />
      <points geometry={geometry.nodes} material={materials.nodes} frustumCulled={false} />
      <points geometry={geometry.pulses} material={materials.pulses} frustumCulled={false} />
    </group>
  )
}

export default function NetworkScene({ dark, running }: { dark: boolean; running: boolean }) {
  return (
    <Canvas
      frameloop={running ? 'always' : 'never'}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.6, 10], fov: 55, near: 0.1, far: 120 }}
      gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ camera }) => camera.lookAt(0, -0.8, 0)}
    >
      <Network dark={dark} />
    </Canvas>
  )
}
