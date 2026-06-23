import * as M from './matrices.js'

function computeVectorOp(a, b, op) {
  if (op === 'add')   return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
  if (op === 'sub')   return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
  if (op === 'cross') return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ]
  return [0, 0, 0]
}

// Apply only the rotation/scale part of a column-major matrix to a vector [x, y, z].
function applyMatrix3(mat, v) {
  return [
    mat[0]*v[0] + mat[4]*v[1] + mat[8]*v[2],
    mat[1]*v[0] + mat[5]*v[1] + mat[9]*v[2],
    mat[2]*v[0] + mat[6]*v[1] + mat[10]*v[2],
  ]
}

// Returns { matrices: { [objectId]: matrix[] }, objectAttrs: { [objectId]: patch } }
// Two-pass: pass 1 builds all matrices, pass 2 computes attribute patches using those matrices.
export function evaluateGraph(nodes, edges, globalTime, objects = []) {
  const matrices = {}

  // ── Pass 1: compute transform matrices for all object nodes ──────────────────
  for (const node of nodes) {
    if (node.type !== 'objectNode') continue
    const obj = objects.find(o => o.id === node.data.objectId)

    const chain = getChain(node.id, nodes, edges)
    // Lines use their pose matrix as the base; all others start from identity
    let matrix = obj?.type === 'line'
      ? M.lineMatrix(obj.px ?? 0, obj.py ?? 0, obj.pz ?? 0, obj.dx ?? 1, obj.dy ?? 0, obj.dz ?? 0)
      : M.identity()
    for (const t of chain) {
      // Scale and composite are skipped for lines — scale is undefined for infinite lines
      if (obj?.type === 'line') {
        const tt = t.data?.transformType
        if (tt === 'scale' || tt === 'composite') continue
      }
      matrix = M.multiply(evalTransform(t, nodes, edges, globalTime, objects, matrices), matrix)
    }
    matrices[node.data.objectId] = matrix
  }

  // ── Segment post-pass: matrix = chainMat * poseMatrix(midpoint, A→B) ─────────
  for (const node of nodes) {
    if (node.type !== 'objectNode') continue
    const obj = objects.find(o => o.id === node.data.objectId)
    if (!obj || obj.type !== 'segment') continue

    const eA = edges.find(e => e.target === node.id && e.targetHandle === 'seg-a')
    const eB = edges.find(e => e.target === node.id && e.targetHandle === 'seg-b')
    const srcA = eA ? nodes.find(n => n.id === eA.source) : null
    const srcB = eB ? nodes.find(n => n.id === eB.source) : null
    const ptA = srcA?.data?.objectId ? objects.find(o => o.id === srcA.data.objectId) : null
    const ptB = srcB?.data?.objectId ? objects.find(o => o.id === srcB.data.objectId) : null
    if (!ptA || !ptB) continue

    const worldPos = (pt) => {
      const m = matrices[pt.id] ?? M.identity()
      const x = pt.x ?? 0, y = pt.y ?? 0, z = pt.z ?? 0
      return [
        m[0]*x + m[4]*y + m[8]*z + m[12],
        m[1]*x + m[5]*y + m[9]*z + m[13],
        m[2]*x + m[6]*y + m[10]*z + m[14],
      ]
    }

    const wA = worldPos(ptA)
    const wB = worldPos(ptB)
    const base = M.poseMatrix(
      (wA[0]+wB[0])/2, (wA[1]+wB[1])/2, (wA[2]+wB[2])/2,
      wB[0]-wA[0], wB[1]-wA[1], wB[2]-wA[2]
    )
    matrices[obj.id] = M.multiply(matrices[obj.id] ?? M.identity(), base)
  }

  // ── Pass 2: compute attribute patches (uses matrices from pass 1) ────────────
  const objectAttrs = {}

  for (const node of nodes) {
    if (node.type !== 'objectNode') continue

    const obj = objects.find(o => o.id === node.data.objectId)
    if (!obj) continue

    const resolve = (handleId) => {
      const edge = edges.find(e => e.target === node.id && e.targetHandle === handleId)
      if (!edge) return null
      const src = nodes.find(n => n.id === edge.source)
      return src ? evalMathNode(src, nodes, edges, globalTime, objects, edge.sourceHandle, matrices) : null
    }

    let patch = null

    if (obj.type === 'plane') {
      const nx = resolve('plane-nx'), ny = resolve('plane-ny'), nz = resolve('plane-nz')
      const dist = resolve('plane-dist')
      if (nx !== null || ny !== null || nz !== null || dist !== null) {
        patch = {}
        if (nx !== null || ny !== null || nz !== null) {
          const cur = obj.normal ?? [0, 1, 0]
          patch.normal = [nx ?? cur[0], ny ?? cur[1], nz ?? cur[2]]
        }
        if (dist !== null) patch.distance = dist
      }
    } else if (obj.type === 'sphere') {
      const radius = resolve('sphere-radius')
      if (radius !== null) patch = { radius: Math.max(0.01, radius) }
    } else if (obj.type === 'cube') {
      const size = resolve('cube-size')
      if (size !== null) patch = { size: Math.max(0.01, size) }
    } else if (obj.type === 'cone') {
      const radius = resolve('cone-radius'), height = resolve('cone-height')
      if (radius !== null || height !== null) {
        patch = {}
        if (radius !== null) patch.radius = Math.max(0.01, radius)
        if (height !== null) patch.height = Math.max(0.01, height)
      }
    } else if (obj.type === 'cylinder') {
      const radius = resolve('cylinder-radius'), height = resolve('cylinder-height')
      if (radius !== null || height !== null) {
        patch = {}
        if (radius !== null) patch.radius = Math.max(0.01, radius)
        if (height !== null) patch.height = Math.max(0.01, height)
      }
    } else if (obj.type === 'point') {
      // Priority 1: position driven by a ProjectionNode via point-in
      const pointInEdge = edges.find(e => e.target === node.id && e.targetHandle === 'point-in')
      if (pointInEdge) {
        const projNode = nodes.find(n => n.id === pointInEdge.source)
        if (projNode?.type === 'pointOnLineNode' || projNode?.type === 'pointOnPlaneNode') {
          const result = _computeProjectionWorld(projNode, nodes, edges, objects, matrices)
          if (result) patch = { x: result.proj[0], y: result.proj[1], z: result.proj[2] }
        }
      }
      // Priority 2: individual scalar connections via point-x/y/z
      if (!patch) {
        const x = resolve('point-x'), y = resolve('point-y'), z = resolve('point-z')
        if (x !== null || y !== null || z !== null) {
          patch = {}
          if (x !== null) patch.x = x
          if (y !== null) patch.y = y
          if (z !== null) patch.z = z
        }
      }
    } else if (obj.type === 'vector') {
      // Priority 1: full vector driven by VectorOpNode via vec-in
      const vecInEdge = edges.find(e => e.target === node.id && e.targetHandle === 'vec-in')
      if (vecInEdge) {
        const opNode = nodes.find(n => n.id === vecInEdge.source && n.type === 'vectorOpNode')
        if (opNode) {
          const eA = edges.find(e => e.target === opNode.id && e.targetHandle === 'vec-in-a')
          const eB = edges.find(e => e.target === opNode.id && e.targetHandle === 'vec-in-b')
          const nA = eA ? nodes.find(n => n.id === eA.source) : null
          const nB = eB ? nodes.find(n => n.id === eB.source) : null
          const vA = nA?.data?.objectId ? objects.find(o => o.id === nA.data.objectId) : null
          const vB = nB?.data?.objectId ? objects.find(o => o.id === nB.data.objectId) : null
          if (vA && vB) {
            // Apply each vector's transform matrix (rotation/scale only — vectors are free)
            const tA = applyMatrix3(matrices[vA.id] ?? M.identity(), [vA.x ?? 0, vA.y ?? 0, vA.z ?? 0])
            const tB = applyMatrix3(matrices[vB.id] ?? M.identity(), [vB.x ?? 0, vB.y ?? 0, vB.z ?? 0])
            const op = opNode.data.params?.operation ?? 'add'
            const r  = computeVectorOp(tA, tB, op)
            patch = { x: r[0], y: r[1], z: r[2] }
          }
        }
      } else {
        // Priority 2: individual scalar connections via vec-x/y/z
        const x = resolve('vec-x'), y = resolve('vec-y'), z = resolve('vec-z')
        if (x !== null || y !== null || z !== null) {
          patch = {}
          if (x !== null) patch.x = x
          if (y !== null) patch.y = y
          if (z !== null) patch.z = z
        }
      }
    }

    if (patch) objectAttrs[obj.id] = patch
  }

  return { matrices, objectAttrs }
}

// ── Projection helper (world-space) ─────────────────────────────────────────
// Returns { proj: [x,y,z], dist: number } or null if inputs are not connected.

function _computeProjectionWorld(projNode, nodes, edges, objects, matrices) {
  const eP = edges.find(e => e.target === projNode.id && e.targetHandle === 'proj-point-in')
  const eO = edges.find(e => e.target === projNode.id && e.targetHandle === 'proj-onto-in')
  const srcP = eP ? nodes.find(n => n.id === eP.source) : null
  const srcO = eO ? nodes.find(n => n.id === eO.source) : null
  const pObj = srcP?.data?.objectId ? objects.find(o => o.id === srcP.data.objectId) : null
  const oObj = srcO?.data?.objectId ? objects.find(o => o.id === srcO.data.objectId) : null
  if (!pObj || !oObj) return null

  const pm = matrices[pObj.id] ?? M.identity()
  const x = pObj.x ?? 0, y = pObj.y ?? 0, z = pObj.z ?? 0
  const P = [
    pm[0]*x + pm[4]*y + pm[8]*z + pm[12],
    pm[1]*x + pm[5]*y + pm[9]*z + pm[13],
    pm[2]*x + pm[6]*y + pm[10]*z + pm[14],
  ]

  if (projNode.type === 'pointOnLineNode') {
    const lm   = matrices[oObj.id] ?? M.identity()
    const P0   = [lm[12], lm[13], lm[14]]
    const dRaw = [lm[8],  lm[9],  lm[10]]
    const dLen = Math.sqrt(dRaw[0]**2 + dRaw[1]**2 + dRaw[2]**2)
    if (dLen < 1e-10) return null
    const d    = dRaw.map(v => v / dLen)
    const v    = [P[0]-P0[0], P[1]-P0[1], P[2]-P0[2]]
    const t    = v[0]*d[0] + v[1]*d[1] + v[2]*d[2]
    const proj = [P0[0]+t*d[0], P0[1]+t*d[1], P0[2]+t*d[2]]
    const diff = [P[0]-proj[0], P[1]-proj[1], P[2]-proj[2]]
    return { proj, dist: Math.sqrt(diff[0]**2 + diff[1]**2 + diff[2]**2) }
  } else {
    const chainMat = matrices[oObj.id] ?? M.identity()
    const baseMat  = M.planeMatrix(oObj.normal ?? [0,1,0], oObj.distance ?? 0)
    const worldMat = M.multiply(chainMat, baseMat)
    const nRaw = [worldMat[8], worldMat[9], worldMat[10]]
    const nLen = Math.sqrt(nRaw[0]**2 + nRaw[1]**2 + nRaw[2]**2)
    if (nLen < 1e-10) return null
    const n      = nRaw.map(v => v / nLen)
    const anchor = [worldMat[12], worldMat[13], worldMat[14]]
    const dPlane = anchor[0]*n[0] + anchor[1]*n[1] + anchor[2]*n[2]
    const sd     = P[0]*n[0] + P[1]*n[1] + P[2]*n[2] - dPlane
    const proj   = [P[0]-sd*n[0], P[1]-sd*n[1], P[2]-sd*n[2]]
    return { proj, dist: Math.abs(sd) }
  }
}

// Follow out→in edges (the transform chain), ignoring param connections.
function getChain(startId, nodes, edges) {
  const chain = []
  const visited = new Set()
  let cur = startId

  while (true) {
    if (visited.has(cur)) break
    visited.add(cur)

    const edge = edges.find(e =>
      e.source === cur &&
      (e.sourceHandle === 'out' || !e.sourceHandle) &&
      (e.targetHandle === 'in'  || !e.targetHandle)
    )
    if (!edge) break

    const next = nodes.find(n => n.id === edge.target)
    if (!next || next.type === 'objectNode') break

    chain.push(next)
    cur = next.id
  }

  return chain
}

function evalTransform(node, nodes, edges, t, objects, matrices) {
  const { transformType, params } = node.data
  const p = (name) => resolveParam(name, node, nodes, edges, t, params[name] ?? 0, objects, matrices)

  switch (transformType) {
    case 'rotationX':   return M.rotationX(p('angle'))
    case 'rotationY':   return M.rotationY(p('angle'))
    case 'rotationZ':   return M.rotationZ(p('angle'))
    case 'translation': return M.translation(p('x'), p('y'), p('z'), p('scale'))
    case 'scale':       return M.scale(p('x'), p('y'), p('z'))
    case 'reflection':  return M.reflection(params.axis ?? 'XY')
    case 'composite':   return params.matrix?.length === 16 ? [...params.matrix] : M.identity()
    default:            return M.identity()
  }
}

// If a math node is connected to this param handle, use its output; else use staticValue.
function resolveParam(paramName, node, nodes, edges, globalTime, staticValue, objects, matrices = {}) {
  const edge = edges.find(e =>
    e.target === node.id && e.targetHandle === `param-${paramName}`
  )
  if (!edge) return staticValue

  const src = nodes.find(n => n.id === edge.source)
  return src ? evalMathNode(src, nodes, edges, globalTime, objects, edge.sourceHandle, matrices) : staticValue
}

function evalMathNode(node, nodes, edges, globalTime, objects, sourceHandle, matrices = {}) {
  switch (node.type) {
    case 'timeNode':
      return globalTime

    case 'scalarNode':
      return node.data.params?.value ?? 0

    case 'expressionNode': {
      const expr = node.data.params?.expression ?? '0'
      try {
        // eslint-disable-next-line no-new-func
        const result = new Function('t', 'PI', 'sin', 'cos', 'abs', 'floor', `return (${expr})`)(
          globalTime, Math.PI, Math.sin, Math.cos, Math.abs, Math.floor
        )
        return isNaN(result) ? 0 : result
      } catch { return 0 }
    }

    case 'waveformNode': {
      const p     = node.data.params ?? {}
      const freq  = p.frequency ?? 1
      const amp   = p.amplitude ?? 1
      const phase = p.phase ?? 0

      const timeEdge = edges.find(e => e.target === node.id && e.targetHandle === 'time-in')
      const t = timeEdge
        ? evalMathNode(nodes.find(n => n.id === timeEdge.source), nodes, edges, globalTime, objects, timeEdge.sourceHandle)
        : globalTime

      const x = t * freq + phase
      switch (p.type) {
        case 'cos':      return Math.cos(x * 2 * Math.PI) * amp
        case 'sawtooth': return (((x % 1) + 1) % 1 * 2 - 1) * amp
        default:         return Math.sin(x * 2 * Math.PI) * amp
      }
    }

    case 'vectorOpNode': {
      const p    = node.data.params ?? {}
      const eA   = edges.find(e => e.target === node.id && e.targetHandle === 'vec-in-a')
      const eB   = edges.find(e => e.target === node.id && e.targetHandle === 'vec-in-b')
      const srcA = eA ? nodes.find(n => n.id === eA.source) : null
      const srcB = eB ? nodes.find(n => n.id === eB.source) : null
      const vecA = srcA?.data?.objectId ? objects.find(o => o.id === srcA.data.objectId) : null
      const vecB = srcB?.data?.objectId ? objects.find(o => o.id === srcB.data.objectId) : null
      if (!vecA || !vecB) return 0
      const a = [vecA.x ?? 0, vecA.y ?? 0, vecA.z ?? 0]
      const b = [vecB.x ?? 0, vecB.y ?? 0, vecB.z ?? 0]
      if (sourceHandle === 'dot-out') return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
      if (sourceHandle === 'angle-out') {
        const dot  = a[0]*b[0] + a[1]*b[1] + a[2]*b[2]
        const lenA = Math.sqrt(a[0]**2 + a[1]**2 + a[2]**2)
        const lenB = Math.sqrt(b[0]**2 + b[1]**2 + b[2]**2)
        if (lenA < 1e-10 || lenB < 1e-10) return 0
        return Math.acos(Math.max(-1, Math.min(1, dot / (lenA * lenB)))) * 180 / Math.PI
      }
      const result = computeVectorOp(a, b, p.operation ?? 'add')
      if (sourceHandle === 'res-y') return result[1]
      if (sourceHandle === 'res-z') return result[2]
      return result[0]
    }

    case 'pointOnLineNode':
    case 'pointOnPlaneNode': {
      if (sourceHandle !== 'dist-out') return 0
      const result = _computeProjectionWorld(node, nodes, edges, objects, matrices)
      return result?.dist ?? 0
    }

    default:
      return 0
  }
}
