import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../store/useSceneStore'
import { evaluateGraph } from '../utils/evaluateGraph'
import { planeMatrix, multiply } from '../utils/matrices'
import CustomAxes from './CustomAxes'

function vecOp(a, b, op) {
  if (op === 'add')   return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
  if (op === 'sub')   return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
  if (op === 'cross') return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
  return [0, 0, 0]
}

function SceneLoop() {
  useFrame((_, delta) => {
    const store = useSceneStore.getState()
    const { nodes, edges, clock, objects } = store

    // Compute new time locally (avoids reading store twice)
    const newTime = clock.running
      ? clock.globalTime + delta * clock.speed
      : clock.globalTime

    store.tick(delta)

    const { matrices, objectAttrs } = evaluateGraph(nodes, edges, newTime, objects)
    for (const [objectId, matrix] of Object.entries(matrices)) {
      store.updateMatrix(objectId, matrix)
    }
    for (const [objectId, attrs] of Object.entries(objectAttrs)) {
      store.updateObject(objectId, attrs)
    }
  })
  return null
}

const GEOMETRY = {
  sphere: <sphereGeometry args={[1, 32, 32]} />,
  torus:  <torusGeometry args={[1, 0.4, 16, 100]} />,
}

function resolveGeometry(object) {
  if (object.type === 'plane')    { const s = object.size ?? 3; return <planeGeometry args={[s, s]} /> }
  if (object.type === 'cube')     return <boxGeometry args={[object.size ?? 2, object.size ?? 2, object.size ?? 2]} />
  if (object.type === 'sphere')   return <sphereGeometry args={[object.radius ?? 1, 32, 32]} />
  if (object.type === 'cone')     return <coneGeometry args={[object.radius ?? 1, object.height ?? 2, 32]} />
  if (object.type === 'cylinder') return <cylinderGeometry args={[object.radius ?? 1, object.radius ?? 1, object.height ?? 2, 32]} />
  return GEOMETRY[object.type] ?? <boxGeometry args={[2, 2, 2]} />
}

function PlaneNormalArrow({ objectId }) {
  const arrowRef = useRef()

  const arrow = useMemo(() => new THREE.ArrowHelper(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 0),
    1.5, 0xffffff, 0.3, 0.15
  ), [])

  useEffect(() => () => { arrow.line.material.dispose(); arrow.cone.material.dispose() }, [arrow])

  useFrame(() => {
    if (!arrowRef.current) return
    const state = useSceneStore.getState()
    const obj = state.objects.find(o => o.id === objectId)
    if (!obj?.normal) return
    const transformMat = state.matrices[objectId]
    if (!transformMat) return

    // Full world matrix = transform chain * plane base orientation
    const M = multiply(transformMat, planeMatrix(obj.normal, obj.distance ?? 0))

    // Column 3 = world position of the plane center
    const wx = M[12], wy = M[13], wz = M[14]
    // Column 2 = world direction of the plane's local +Z (i.e. world normal)
    const dx = M[8], dy = M[9], dz = M[10]
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (len < 1e-10) return

    arrowRef.current.position.set(wx, wy, wz)
    arrowRef.current.setDirection(new THREE.Vector3(dx/len, dy/len, dz/len))
    arrowRef.current.setColor(new THREE.Color(obj.color))
  })

  return <primitive ref={arrowRef} object={arrow} />
}

// Always-mounted component — manages all VectorOpNode result arrows imperatively,
// consistent with the rest of the codebase's getState()-in-useFrame pattern.
function VectorOpResults() {
  const { scene } = useThree()
  const arrows = useRef({}) // { nodeId: THREE.ArrowHelper }

  useFrame(() => {
    const state = useSceneStore.getState()
    const opNodes = state.nodes.filter(n => n.type === 'vectorOpNode')
    const liveIds = new Set(opNodes.map(n => n.id))

    // Remove arrows for deleted nodes
    for (const id of Object.keys(arrows.current)) {
      if (!liveIds.has(id)) {
        scene.remove(arrows.current[id])
        arrows.current[id].line.material.dispose()
        arrows.current[id].cone.material.dispose()
        delete arrows.current[id]
      }
    }

    // Create/update arrows for current nodes
    for (const node of opNodes) {
      if (!arrows.current[node.id]) {
        const a = new THREE.ArrowHelper(
          new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0),
          1, 0xffffff, 0.25, 0.12
        )
        a.visible = false
        scene.add(a)
        arrows.current[node.id] = a
      }

      const arrow = arrows.current[node.id]
      const p    = node.data.params ?? {}
      const eA   = state.edges.find(e => e.target === node.id && e.targetHandle === 'vec-in-a')
      const eB   = state.edges.find(e => e.target === node.id && e.targetHandle === 'vec-in-b')
      const srcA = eA ? state.nodes.find(n => n.id === eA.source) : null
      const srcB = eB ? state.nodes.find(n => n.id === eB.source) : null
      const vecA = srcA?.data?.objectId ? state.objects.find(o => o.id === srcA.data.objectId) : null
      const vecB = srcB?.data?.objectId ? state.objects.find(o => o.id === srcB.data.objectId) : null

      if (!vecA || !vecB || !p.showResult) { arrow.visible = false; continue }

      // Apply each vector's transform matrix (rotation/scale only — vectors are free)
      const identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
      const mA = state.matrices[vecA.id] ?? identity
      const mB = state.matrices[vecB.id] ?? identity
      const applyMat3 = (m, v) => [
        m[0]*v[0]+m[4]*v[1]+m[8]*v[2],
        m[1]*v[0]+m[5]*v[1]+m[9]*v[2],
        m[2]*v[0]+m[6]*v[1]+m[10]*v[2],
      ]
      const tA = applyMat3(mA, [vecA.x ?? 0, vecA.y ?? 0, vecA.z ?? 0])
      const tB = applyMat3(mB, [vecB.x ?? 0, vecB.y ?? 0, vecB.z ?? 0])

      const result = vecOp(tA, tB, p.operation ?? 'add')
      const len = Math.sqrt(result[0]**2 + result[1]**2 + result[2]**2)
      if (len < 1e-10) { arrow.visible = false; continue }

      arrow.visible = true
      arrow.position.set(0, 0, 0)
      arrow.setDirection(new THREE.Vector3(result[0]/len, result[1]/len, result[2]/len))
      arrow.setLength(len, Math.min(0.25, len * 0.2), Math.min(0.12, len * 0.1))
      arrow.setColor(new THREE.Color(p.color ?? '#a78bfa'))
    }
  })

  useEffect(() => () => {
    for (const arrow of Object.values(arrows.current)) {
      scene.remove(arrow)
      arrow.line.material.dispose()
      arrow.cone.material.dispose()
    }
  }, [scene])

  return null
}

function PointObject({ object }) {
  const meshRef = useRef()
  const matRef  = useRef()

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const state = useSceneStore.getState()
    const obj = state.objects.find(o => o.id === object.id)
    const matrix = state.matrices[object.id]
    if (!obj || !matrix) return
    const x = obj.x ?? 0, y = obj.y ?? 0, z = obj.z ?? 0
    meshRef.current.position.set(
      matrix[0]*x + matrix[4]*y + matrix[8]*z  + matrix[12],
      matrix[1]*x + matrix[5]*y + matrix[9]*z  + matrix[13],
      matrix[2]*x + matrix[6]*y + matrix[10]*z + matrix[14],
    )
    if (matRef.current) {
      const sel = state.selectedObjectId === object.id
      matRef.current.emissiveIntensity = sel
        ? 0.4 + 0.3 * Math.sin(clock.getElapsedTime() * 5) : 0
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 16, 16]} />
      <meshStandardMaterial ref={matRef} color={object.color}
        emissive={object.color} emissiveIntensity={0} />
    </mesh>
  )
}

function VectorObject({ object }) {
  const arrowRef = useRef()

  const arrow = useMemo(() => new THREE.ArrowHelper(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    1, 0xffffff, 0.2, 0.1
  ), [])

  useEffect(() => () => { arrow.line.material.dispose(); arrow.cone.material.dispose() }, [arrow])

  useFrame(({ clock }) => {
    if (!arrowRef.current) return
    const state = useSceneStore.getState()
    const obj = state.objects.find(o => o.id === object.id)
    const matrix = state.matrices[object.id]
    if (!obj || !matrix) return

    const x = obj.x ?? 1, y = obj.y ?? 0, z = obj.z ?? 0

    // Tail always at origin — vectors are free (not bound to a point)
    // Apply only the rotation/scale part of the matrix (upper-left 3×3, no translation)
    const dx = matrix[0]*x + matrix[4]*y + matrix[8]*z
    const dy = matrix[1]*x + matrix[5]*y + matrix[9]*z
    const dz = matrix[2]*x + matrix[6]*y + matrix[10]*z
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (len < 1e-10) return

    arrowRef.current.position.set(0, 0, 0)
    arrowRef.current.setDirection(new THREE.Vector3(dx/len, dy/len, dz/len))
    arrowRef.current.setLength(len, Math.min(0.25, len * 0.2), Math.min(0.12, len * 0.1))

    const base = new THREE.Color(obj.color)
    if (state.selectedObjectId === object.id) {
      const t = 0.35 + 0.25 * Math.sin(clock.getElapsedTime() * 5)
      arrowRef.current.setColor(base.clone().lerp(new THREE.Color(0xffffff), t))
    } else {
      arrowRef.current.setColor(base)
    }
  })

  return <primitive ref={arrowRef} object={arrow} />
}

function LineObject({ object }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    return g
  }, [])

  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: object.color }), [])

  const line = useMemo(() => new THREE.Line(geo, mat), [geo, mat])

  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  useFrame(({ clock }) => {
    const state = useSceneStore.getState()
    const obj = state.objects.find(o => o.id === object.id)
    const m = state.matrices[object.id]
    if (!obj || !m) return

    // Translation = projection point (col 3 of the pose matrix)
    const tx = m[12], ty = m[13], tz = m[14]
    // Direction = local Z axis (col 2)
    const dx = m[8], dy = m[9], dz = m[10]
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
    if (len < 1e-10) { line.visible = false; return }
    line.visible = true

    const nx = dx/len, ny = dy/len, nz = dz/len
    const ext = 20
    const pos = geo.attributes.position
    pos.setXYZ(0, tx - nx*ext, ty - ny*ext, tz - nz*ext)
    pos.setXYZ(1, tx + nx*ext, ty + ny*ext, tz + nz*ext)
    pos.needsUpdate = true

    const base = new THREE.Color(obj.color)
    if (state.selectedObjectId === object.id) {
      const t = 0.35 + 0.25 * Math.sin(clock.getElapsedTime() * 5)
      mat.color.copy(base.clone().lerp(new THREE.Color(0xffffff), t))
    } else {
      mat.color.copy(base)
    }
  })

  return <primitive object={line} />
}

function SegmentObject({ object }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    return g
  }, [])
  const mat = useMemo(() => new THREE.LineBasicMaterial({ color: object.color }), [object.color])
  const line = useMemo(() => new THREE.Line(geo, mat), [geo, mat])

  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  useFrame(() => {
    const state = useSceneStore.getState()
    const obj = state.objects.find(o => o.id === object.id)
    if (!obj) { line.visible = false; return }

    const segNode = state.nodes.find(n => n.type === 'objectNode' && n.data.objectId === obj.id)
    if (!segNode) { line.visible = false; return }

    const getPointPos = (handle) => {
      const edge = state.edges.find(e => e.target === segNode.id && e.targetHandle === handle)
      if (!edge) return null
      const srcNode = state.nodes.find(n => n.id === edge.source)
      const pt = srcNode?.data?.objectId ? state.objects.find(o => o.id === srcNode.data.objectId) : null
      if (!pt || pt.type !== 'point') return null
      const m = state.matrices[pt.id]
      if (!m) return null
      const x = pt.x ?? 0, y = pt.y ?? 0, z = pt.z ?? 0
      return [
        m[0]*x + m[4]*y + m[8]*z + m[12],
        m[1]*x + m[5]*y + m[9]*z + m[13],
        m[2]*x + m[6]*y + m[10]*z + m[14],
      ]
    }

    const pA = getPointPos('seg-a')
    const pB = getPointPos('seg-b')

    if (!pA || !pB) { line.visible = false; return }
    line.visible = true

    const pos = geo.attributes.position
    pos.setXYZ(0, pA[0], pA[1], pA[2])
    pos.setXYZ(1, pB[0], pB[1], pB[2])
    pos.needsUpdate = true

    mat.color.set(obj.color)
  })

  return <primitive object={line} />
}

// ── Point label — billboarded, shows name + live coordinates ─────────────────

function PointLabel({ objectId }) {
  const groupRef = useRef()
  const obj   = useSceneStore(s => s.objects.find(o => o.id === objectId))
  const label = useSceneStore(s =>
    s.nodes.find(n => n.type === 'objectNode' && n.data.objectId === objectId)?.data.label ?? ''
  )

  useFrame(() => {
    const state  = useSceneStore.getState()
    const o      = state.objects.find(o => o.id === objectId)
    const matrix = state.matrices[objectId]
    if (!o || !matrix || !groupRef.current) return
    const x = o.x ?? 0, y = o.y ?? 0, z = o.z ?? 0
    groupRef.current.position.set(
      matrix[0]*x + matrix[4]*y + matrix[8]*z  + matrix[12] + 0.14,
      matrix[1]*x + matrix[5]*y + matrix[9]*z  + matrix[13] + 0.14,
      matrix[2]*x + matrix[6]*y + matrix[10]*z + matrix[14],
    )
  })

  if (!obj) return null

  return (
    <group ref={groupRef}>
      <Billboard>
        <Text
          fontSize={0.16} color={obj.color}
          anchorX="left" anchorY="middle"
          outlineWidth={0.04} outlineColor="#000000"
        >{label}</Text>
      </Billboard>
    </group>
  )
}

// ── Vector label — billboarded arrow + name at the vector tip ────────────────

function VectorLabel({ objectId }) {
  const groupRef = useRef()
  const obj   = useSceneStore(s => s.objects.find(o => o.id === objectId))
  const label = useSceneStore(s =>
    s.nodes.find(n => n.type === 'objectNode' && n.data.objectId === objectId)?.data.label ?? ''
  )

  useFrame(() => {
    const state  = useSceneStore.getState()
    const o      = state.objects.find(o => o.id === objectId)
    const matrix = state.matrices[objectId]
    if (!o || !matrix || !groupRef.current) return
    const vx = o.x ?? 1, vy = o.y ?? 0, vz = o.z ?? 0
    // Midpoint = half the rotation/scale-transformed vector
    groupRef.current.position.set(
      (matrix[0]*vx + matrix[4]*vy + matrix[8]*vz) * 0.5,
      (matrix[1]*vx + matrix[5]*vy + matrix[9]*vz) * 0.5,
      (matrix[2]*vx + matrix[6]*vy + matrix[10]*vz) * 0.5,
    )
  })

  if (!obj) return null

  return (
    <group ref={groupRef}>
      <Billboard>
        <Text
          fontSize={0.20} color={obj.color}
          anchorX="center" anchorY="middle"
          outlineWidth={0.04} outlineColor="#000000"
        >{label}</Text>
      </Billboard>
    </group>
  )
}

const BASIS = [
  { color: 0xff4444, cols: [0, 1, 2]  },   // e₁ → column 0 (red)
  { color: 0x44dd44, cols: [4, 5, 6]  },   // e₂ → column 1 (green)
  { color: 0x4499ff, cols: [8, 9, 10] },   // e₃ → column 2 (blue)
]

function BasisArrows({ objectId }) {
  const r0 = useRef(), r1 = useRef(), r2 = useRef()
  const refs = [r0, r1, r2]

  const arrows = useMemo(() => BASIS.map(b =>
    new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0),
      1, b.color, 0.2, 0.08
    )
  ), [])

  useEffect(() => () => {
    arrows.forEach(a => { a.line.material.dispose(); a.cone.material.dispose() })
  }, [arrows])

  useFrame(() => {
    const m = useSceneStore.getState().matrices[objectId]
    if (!m) return
    const tx = m[12], ty = m[13], tz = m[14]

    BASIS.forEach(({ cols }, i) => {
      if (!refs[i].current) return
      const [i0, i1, i2] = cols
      const dx = m[i0], dy = m[i1], dz = m[i2]
      const len = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (len < 1e-10) { refs[i].current.visible = false; return }
      refs[i].current.visible = true
      refs[i].current.position.set(tx, ty, tz)
      refs[i].current.setDirection(new THREE.Vector3(dx/len, dy/len, dz/len))
      refs[i].current.setLength(len, Math.min(0.2, len * 0.15), Math.min(0.08, len * 0.06))
    })
  })

  return (
    <>
      <primitive ref={refs[0]} object={arrows[0]} />
      <primitive ref={refs[1]} object={arrows[1]} />
      <primitive ref={refs[2]} object={arrows[2]} />
    </>
  )
}

function SceneObject({ object }) {
  const meshRef = useRef()
  const matRef  = useRef()
  const mat4    = useRef(new THREE.Matrix4())

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const state = useSceneStore.getState()
    let matrix = state.matrices[object.id]
    if (!matrix) return

    // Plane: apply intrinsic n·x=d orientation as a base transform
    if (object.type === 'plane' && object.normal) {
      const base = planeMatrix(object.normal, object.distance ?? 0)
      matrix = multiply(matrix, base)
    }

    mat4.current.fromArray(matrix)
    meshRef.current.matrix.copy(mat4.current)
    meshRef.current.matrixWorldNeedsUpdate = true

    if (matRef.current) {
      const sel = state.selectedObjectId === object.id
      matRef.current.emissiveIntensity = sel
        ? 0.2 + 0.15 * Math.sin(clock.getElapsedTime() * 5) : 0
    }
  })

  const isFlat = object.type === 'plane'
  const geom = resolveGeometry(object)

  return (
    <>
      <mesh ref={meshRef} matrixAutoUpdate={false}>
        {geom}
        <meshStandardMaterial
          ref={matRef}
          color={object.color}
          emissive={object.color}
          emissiveIntensity={0}
          wireframe={object.wireframe}
          transparent={object.opacity !== undefined && object.opacity < 1}
          opacity={object.opacity ?? 1}
          depthWrite={object.opacity === undefined || object.opacity >= 1}
          side={isFlat ? THREE.DoubleSide : THREE.FrontSide}
        />
      </mesh>
      {object.showNormal && object.type === 'plane' && <PlaneNormalArrow objectId={object.id} />}
    </>
  )
}

export default function Scene() {
  const objects  = useSceneStore(s => s.objects)
  const showAxes = useSceneStore(s => s.showAxes)

  return (
    <Canvas
      camera={{ position: [6, -6, 5], fov: 55 }}
      onCreated={({ camera }) => {
        camera.up.set(0, 0, 1)
        camera.lookAt(0, 0, 0)
      }}
    >
      <color attach="background" args={['#1a1a2e']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 8]} intensity={1.2} castShadow />
      <pointLight position={[-4, -4, 2]} intensity={0.4} color="#7F77DD" />

      {objects.map(obj => {
        if (obj.type === 'point')   return <PointObject   key={obj.id} object={obj} />
        if (obj.type === 'vector')  return <VectorObject  key={obj.id} object={obj} />
        if (obj.type === 'line')    return <LineObject    key={obj.id} object={obj} />
        if (obj.type === 'segment') return <SegmentObject key={obj.id} object={obj} />
        return <SceneObject key={obj.id} object={obj} />
      })}

      {objects.filter(o => o.showBasis).map(o => <BasisArrows key={o.id} objectId={o.id} />)}
      {objects.filter(o => o.showLabel && o.type === 'point').map(o => <PointLabel key={o.id} objectId={o.id} />)}
      {objects.filter(o => o.showLabel && o.type === 'vector').map(o => <VectorLabel key={o.id} objectId={o.id} />)}

      <SceneLoop />
      <VectorOpResults />

      {showAxes && <CustomAxes />}

      {/* Grid on XY plane (z = 0) for Z-up convention */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <Grid
          args={[20, 20]}
          cellColor="#2a2a4a"
          sectionColor="#3a3a6a"
          fadeDistance={20}
          fadeStrength={1}
          infiniteGrid
        />
      </group>
      <OrbitControls makeDefault />
    </Canvas>
  )
}