import { describe, it, expect } from 'vitest'
import { evaluateGraph } from './evaluateGraph.js'
import { identity, rotationZ, translation } from './matrices.js'

// ── helpers ───────────────────────────────────────────────────────────────────

function near(a, b, eps = 1e-6) { return Math.abs(a - b) < eps }

// Minimal node/edge builders
const objectNode = (id, objectId) => ({
  id,
  type: 'objectNode',
  data: { objectId },
})

const transformNode = (id, transformType, params = {}) => ({
  id,
  type: 'transformNode',
  data: { transformType, params },
})

const scalarNode = (id, value) => ({
  id,
  type: 'scalarNode',
  data: { params: { value } },
})

const timeNode = (id) => ({
  id,
  type: 'timeNode',
  data: {},
})

const edge = (source, target, sourceHandle = 'out', targetHandle = 'in') => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle,
  targetHandle,
})

// ── evaluateGraph with no transforms ─────────────────────────────────────────

describe('evaluateGraph — no transforms', () => {
  it('produces identity matrix for an object with no transform chain', () => {
    const obj   = { id: 'obj1', type: 'cube', color: '#fff' }
    const nodes = [objectNode('node1', 'obj1')]
    const { matrices } = evaluateGraph(nodes, [], 0, [obj])
    expect(matrices['obj1']).toEqual(identity())
  })

  it('returns empty matrices when there are no object nodes', () => {
    const { matrices } = evaluateGraph([], [], 0, [])
    expect(Object.keys(matrices)).toHaveLength(0)
  })
})

// ── evaluateGraph — static scalar driving a rotation ─────────────────────────
//
// In this app the data flow is objectNode → transformNode (the chain goes out
// from the object node, not into it).  getChain() follows source=cur edges
// with sourceHandle='out' / targetHandle='in'.

describe('evaluateGraph — scalar → rotationZ angle', () => {
  const obj = { id: 'obj1', type: 'cube', color: '#fff' }

  const nodes = [
    scalarNode('scalar1', 45),
    transformNode('rot1', 'rotationZ', { angle: 0 }),
    objectNode('node1', 'obj1'),
  ]

  const edges = [
    // scalar drives the transform param
    edge('scalar1', 'rot1', 'out', 'param-angle'),
    // objectNode → transformNode  (direction the chain follows)
    edge('node1', 'rot1'),
  ]

  it('matrix equals rotationZ(45)', () => {
    const { matrices } = evaluateGraph(nodes, edges, 0, [obj])
    const expected = rotationZ(45)
    matrices['obj1'].forEach((v, i) => {
      expect(v).toBeCloseTo(expected[i])
    })
  })
})

// ── evaluateGraph — translation transform ─────────────────────────────────────

describe('evaluateGraph — static translation', () => {
  const obj = { id: 'obj1', type: 'sphere', color: '#fff' }

  const nodes = [
    scalarNode('sx', 1),
    scalarNode('sy', 2),
    scalarNode('sz', 3),
    transformNode('t1', 'translation', { x: 0, y: 0, z: 0 }),
    objectNode('node1', 'obj1'),
  ]

  const edges = [
    edge('sx', 't1', 'out', 'param-x'),
    edge('sy', 't1', 'out', 'param-y'),
    edge('sz', 't1', 'out', 'param-z'),
    // objectNode → transformNode
    edge('node1', 't1'),
  ]

  it('matrix equals translation(1,2,3)', () => {
    const { matrices } = evaluateGraph(nodes, edges, 0, [obj])
    const expected = translation(1, 2, 3, 1)
    matrices['obj1'].forEach((v, i) => {
      expect(v).toBeCloseTo(expected[i])
    })
  })
})

// ── evaluateGraph — time node drives angle ────────────────────────────────────

describe('evaluateGraph — time node', () => {
  const obj = { id: 'obj1', type: 'cube', color: '#fff' }

  const nodes = [
    timeNode('t'),
    transformNode('rot1', 'rotationZ', { angle: 0 }),
    objectNode('node1', 'obj1'),
  ]

  const edges = [
    edge('t', 'rot1', 'out', 'param-angle'),
    // objectNode → transformNode
    edge('node1', 'rot1'),
  ]

  it('at t=0 → rotationZ(0) = identity', () => {
    const { matrices } = evaluateGraph(nodes, edges, 0, [obj])
    identity().forEach((v, i) => expect(matrices['obj1'][i]).toBeCloseTo(v))
  })

  it('at t=90 → rotationZ(90)', () => {
    const { matrices } = evaluateGraph(nodes, edges, 90, [obj])
    const expected = rotationZ(90)
    expected.forEach((v, i) => expect(matrices['obj1'][i]).toBeCloseTo(v))
  })
})

// ── evaluateGraph — plane attribute patch (normal / distance) ─────────────────

describe('evaluateGraph — plane normal wired from scalars', () => {
  const obj = { id: 'plane1', type: 'plane', normal: [0, 1, 0], distance: 0, color: '#fff' }

  const nodes = [
    scalarNode('nx', 1),
    scalarNode('ny', 0),
    scalarNode('nz', 0),
    scalarNode('dist', 5),
    objectNode('pNode', 'plane1'),
  ]

  const edges = [
    edge('nx',   'pNode', 'out', 'plane-nx'),
    edge('ny',   'pNode', 'out', 'plane-ny'),
    edge('nz',   'pNode', 'out', 'plane-nz'),
    edge('dist', 'pNode', 'out', 'plane-dist'),
  ]

  it('patches normal and distance from connected scalars', () => {
    const { objectAttrs } = evaluateGraph(nodes, edges, 0, [obj])
    expect(objectAttrs['plane1'].normal).toEqual([1, 0, 0])
    expect(objectAttrs['plane1'].distance).toBe(5)
  })
})

// ── evaluateGraph — point on plane projection ─────────────────────────────────

describe('evaluateGraph — orthogonal projection onto a plane', () => {
  // Plane: XY plane (normal=[0,0,1], d=0)
  // Point: (2, 3, 4)
  // Expected projection: (2, 3, 0),  distance = 4

  const plane = { id: 'plane1', type: 'plane', normal: [0, 0, 1], distance: 0, color: '#aaa' }
  const point = { id: 'pt1',    type: 'point', x: 2, y: 3, z: 4,              color: '#bbb' }
  const result = { id: 'pt2',   type: 'point', x: 0, y: 0, z: 0,              color: '#ccc' }

  const projNode = {
    id:   'proj1',
    type: 'pointOnPlaneNode',
    data: {},
  }

  const planeObjNode  = objectNode('planeNode', 'plane1')
  const pointObjNode  = objectNode('ptNode',    'pt1')
  const resultObjNode = objectNode('resNode',   'pt2')

  const nodes = [planeObjNode, pointObjNode, projNode, resultObjNode]

  const edges = [
    // projection inputs
    edge('ptNode',    'proj1', 'out', 'proj-point-in'),
    edge('planeNode', 'proj1', 'out', 'proj-onto-in'),
    // projection result drives the result point
    edge('proj1', 'resNode', 'out', 'point-in'),
  ]

  it('projects point onto plane correctly', () => {
    const { objectAttrs } = evaluateGraph(nodes, edges, 0, [plane, point, result])
    const patch = objectAttrs['pt2']
    expect(patch.x).toBeCloseTo(2)
    expect(patch.y).toBeCloseTo(3)
    expect(patch.z).toBeCloseTo(0)
  })
})

// ── evaluateGraph — point on line projection ──────────────────────────────────

describe('evaluateGraph — orthogonal projection onto a line', () => {
  // Line: through origin along X axis (px=0,py=0,pz=0, dx=1,dy=0,dz=0)
  // Point: (3, 4, 0)
  // Expected foot: (3, 0, 0),  distance = 4

  const line  = { id: 'line1', type: 'line', px: 0, py: 0, pz: 0, dx: 1, dy: 0, dz: 0, color: '#aaa' }
  const point = { id: 'pt1',   type: 'point', x: 3, y: 4, z: 0,                         color: '#bbb' }
  const result = { id: 'pt2',  type: 'point', x: 0, y: 0, z: 0,                         color: '#ccc' }

  const projNode = { id: 'proj1', type: 'pointOnLineNode', data: {} }

  const lineObjNode   = objectNode('lineNode', 'line1')
  const pointObjNode  = objectNode('ptNode',   'pt1')
  const resultObjNode = objectNode('resNode',  'pt2')

  const nodes = [lineObjNode, pointObjNode, projNode, resultObjNode]

  const edges = [
    edge('ptNode',   'proj1', 'out', 'proj-point-in'),
    edge('lineNode', 'proj1', 'out', 'proj-onto-in'),
    edge('proj1',    'resNode', 'out', 'point-in'),
  ]

  it('projects point onto line correctly', () => {
    const { objectAttrs } = evaluateGraph(nodes, edges, 0, [line, point, result])
    const patch = objectAttrs['pt2']
    expect(patch.x).toBeCloseTo(3)
    expect(patch.y).toBeCloseTo(0)
    expect(patch.z).toBeCloseTo(0)
  })
})
