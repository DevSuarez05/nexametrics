import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Group, Shape } from 'three'

const plate = new Shape()
plate.moveTo(-0.68, -1)
plate.lineTo(0.68, -1); plate.quadraticCurveTo(1, -1, 1, -0.68)
plate.lineTo(1, 0.68); plate.quadraticCurveTo(1, 1, 0.68, 1)
plate.lineTo(-0.68, 1); plate.quadraticCurveTo(-1, 1, -1, 0.68)
plate.lineTo(-1, -0.68); plate.quadraticCurveTo(-1, -1, -0.68, -1)
const nodes = [[-.53, -.41], [-.16, .06], [.16, -.16], [.53, .44]] as const
const extrusion = { depth: .16, bevelThickness: .04, bevelSize: .04, bevelSegments: 3 }

function Medallion({ x, y, scale, angle }: { x: number; y: number; scale: number; angle: number }) {
  const group = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = -.42 + Math.sin(clock.elapsedTime * .13 + angle) * .12
  })
  return <group ref={group} position={[x,y,0]} rotation={[.46,-.42,angle]} scale={scale}>
    <mesh><extrudeGeometry args={[plate, extrusion]} /><meshStandardMaterial color="#64bdb2" metalness={.46} roughness={.3} /></mesh>
    {nodes.map(([u,v], i) => {
      const next = nodes[i+1]
      return <group key={u}>
        <mesh position={[u,v,.22]}><sphereGeometry args={[.15,16,12]} /><meshStandardMaterial color="#12565c" /></mesh>
        {next && <mesh position={[(u+next[0])/2,(v+next[1])/2,.22]} rotation={[0,0,-Math.atan2(next[0]-u,next[1]-v)]}><cylinderGeometry args={[.065,.065,Math.hypot(next[0]-u,next[1]-v),12]} /><meshStandardMaterial color="#12565c" /></mesh>}
      </group>
    })}
  </group>
}

export default function BrandScene() {
  return <Canvas orthographic camera={{position:[0,0,12], zoom:65}} dpr={1} gl={{ alpha:true, antialias:true, powerPreference:'low-power' }}>
    <ambientLight intensity={1.6}/><directionalLight position={[-3,5,5]} intensity={3}/>
    <Medallion x={-2.35} y={.3} scale={1.35} angle={-.4}/><Medallion x={1.75} y={-.5} scale={.85} angle={.42}/><Medallion x={.25} y={.92} scale={.43} angle={-.18}/>
  </Canvas>
}
