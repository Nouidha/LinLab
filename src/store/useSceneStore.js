import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges, addEdge } from 'reactflow'

const IDENTITY = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]

function _snapshot(state) {
  return { objects: state.objects, nodes: state.nodes, edges: state.edges }
}

function _applyScene(data) {
  const matrices = {}
  for (const obj of data.objects ?? []) matrices[obj.id] = [...IDENTITY]
  return {
    objects:      data.objects ?? [],
    nodes:        data.nodes   ?? [],
    edges:        data.edges   ?? [],
    matrices,
    clock: { running: false, globalTime: 0, speed: 1 },
  }
}

let _nodeCounter = 100          // start high to avoid collisions with preset IDs
export function newNodeId(prefix) {
  return `${prefix}-${++_nodeCounter}`
}

const DEFAULT_COLORS = ['#7F77DD', '#5DCAA5', '#EF9F27', '#F0997B', '#6ec3f4', '#e06c75']
let _colorIndex = 1

export const useSceneStore = create((set) => ({
  objects: [
    { id: 'cube-1', type: 'cube', color: '#7F77DD', wireframe: false, size: 2 }
  ],

  nodes: [
    {
      id: 'obj-cube-1',
      type: 'objectNode',
      position: { x: 50, y: 80 },
      data: { objectId: 'cube-1', label: 'Cube', color: '#7F77DD' }
    },
    {
      id: 'rotY-1',
      type: 'transformNode',
      position: { x: 280, y: 60 },
      data: { transformType: 'rotationY', label: 'Rotation Y', params: { angle: 0 } }
    }
  ],

  edges: [
    { id: 'e-obj-rotY', source: 'obj-cube-1', sourceHandle: 'out', target: 'rotY-1', targetHandle: 'in' }
  ],

  clock: { running: false, globalTime: 0, speed: 1 },
  sceneVersion: 0,
  showAxes: true,
  selectedObjectId: null,

  matrices: { 'cube-1': [...IDENTITY] },

  // ── Tabs ──────────────────────────────────────────────────────────────────
  tabs: [{ id: 'tab-1', label: 'Scene 1', snapshot: null, fileHandle: null }],
  activeTabId: 'tab-1',

  // React Flow handlers
  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (params) =>
    set((state) => ({ edges: addEdge(params, state.edges) })),

  // Update node data (for param sliders)
  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      )
    })),

  addNode: (node) =>
    set((state) => ({ nodes: [...state.nodes, node] })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter(n => n.id !== nodeId),
      edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
    })),

  removeEdge: (edgeId) =>
    set((state) => ({ edges: state.edges.filter(e => e.id !== edgeId) })),

  // Add a scene object + its ObjectNode atomically
  addObjectWithNode: (type, pos) =>
    set((state) => {
      const color = DEFAULT_COLORS[_colorIndex++ % DEFAULT_COLORS.length]
      const id    = newNodeId(type)
      const nodeId = `obj-${id}`
      const label  = type.charAt(0).toUpperCase() + type.slice(1)

      const position = pos ?? { x: 50 + Math.random() * 80, y: 80 + state.objects.length * 60 }
      const planeDefaults    = type === 'plane'    ? { normal: [0, 1, 0], distance: 0, showNormal: false, opacity: 0.7 } : {}
      const coneDefaults     = type === 'cone'     ? { radius: 1, height: 2 } : {}
      const cylinderDefaults = type === 'cylinder' ? { radius: 1, height: 2 } : {}
      const cubeDefaults     = type === 'cube'     ? { size: 2 } : {}
      const lineDefaults     = type === 'line'     ? { px: 0, py: 0, pz: 0, dx: 1, dy: 0, dz: 0 } : {}
      const pointDefaults    = type === 'point'    ? { x: 0, y: 0, z: 0, showLabel: false } : {}
      const vectorDefaults   = type === 'vector'   ? { x: 1, y: 0, z: 0, showLabel: false } : {}
      const segmentDefaults  = type === 'segment'  ? {} : {}
      return {
        objects: [...state.objects, { id, type, color, wireframe: false, ...cubeDefaults, ...planeDefaults, ...coneDefaults, ...cylinderDefaults, ...lineDefaults, ...pointDefaults, ...vectorDefaults, ...segmentDefaults }],
        matrices: { ...state.matrices, [id]: [...IDENTITY] },
        nodes: [...state.nodes, {
          id: nodeId,
          type: 'objectNode',
          position,
          data: { objectId: id, label, color }
        }]
      }
    }),

  removeObject: (objectId) =>
    set((state) => {
      const { [objectId]: _, ...restMatrices } = state.matrices
      const objNodeId = state.nodes.find(n => n.type === 'objectNode' && n.data.objectId === objectId)?.id
      return {
        objects: state.objects.filter(o => o.id !== objectId),
        matrices: restMatrices,
        nodes:  state.nodes.filter(n => !(n.type === 'objectNode' && n.data.objectId === objectId)),
        edges:  objNodeId ? state.edges.filter(e => e.source !== objNodeId) : state.edges,
      }
    }),

  updateObject: (objectId, patch) =>
    set((state) => ({
      objects: state.objects.map(o => o.id === objectId ? { ...o, ...patch } : o)
    })),

  // Matrix (written every frame by SceneLoop via evaluateGraph)
  updateMatrix: (objectId, matrix) =>
    set((state) => ({ matrices: { ...state.matrices, [objectId]: matrix } })),

  // Clock
  tick: (delta) =>
    set((state) => ({
      clock: {
        ...state.clock,
        globalTime: state.clock.running
          ? state.clock.globalTime + delta * state.clock.speed
          : state.clock.globalTime
      }
    })),

  toggleClock: () =>
    set((state) => ({ clock: { ...state.clock, running: !state.clock.running } })),

  resetClock: () =>
    set(() => ({ clock: { running: false, globalTime: 0, speed: 1 } })),

  setClockSpeed: (speed) =>
    set((state) => ({ clock: { ...state.clock, speed } })),

  toggleAxes: () =>
    set((state) => ({ showAxes: !state.showAxes })),

  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  // ── Tab actions ───────────────────────────────────────────────────────────

  createTab: (label, scene) =>
    set((state) => {
      const id = `tab-${Date.now()}`
      return {
        tabs: [
          ...state.tabs.map(t =>
            t.id === state.activeTabId ? { ...t, snapshot: _snapshot(state) } : t
          ),
          { id, label, snapshot: scene, fileHandle: null },
        ],
        activeTabId: id,
        ..._applyScene(scene),
        sceneVersion: state.sceneVersion + 1,
      }
    }),

  switchTab: (tabId) =>
    set((state) => {
      if (tabId === state.activeTabId) return state
      const target = state.tabs.find(t => t.id === tabId)
      if (!target) return state
      const scene = target.snapshot ?? _snapshot(state)
      return {
        tabs: state.tabs.map(t =>
          t.id === state.activeTabId ? { ...t, snapshot: _snapshot(state) } : t
        ),
        activeTabId: tabId,
        ..._applyScene(scene),
        sceneVersion: state.sceneVersion + 1,
      }
    }),

  closeTab: (tabId) =>
    set((state) => {
      if (state.tabs.length <= 1) return state
      const idx      = state.tabs.findIndex(t => t.id === tabId)
      const filtered = state.tabs.filter(t => t.id !== tabId)
      if (tabId !== state.activeTabId) return { tabs: filtered }
      const next  = filtered[Math.max(0, idx - 1)]
      const scene = next.snapshot ?? _snapshot(state)
      return {
        tabs: filtered,
        activeTabId: next.id,
        ..._applyScene(scene),
        sceneVersion: state.sceneVersion + 1,
      }
    }),

  renameTab: (tabId, label) =>
    set((state) => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, label } : t)
    })),

  setTabFileHandle: (tabId, handle) =>
    set((state) => ({
      tabs: state.tabs.map(t => t.id === tabId ? { ...t, fileHandle: handle } : t)
    })),

  // Load a full scene from JSON (save/load + example scenes)
  loadScene: (data) =>
    set((state) => {
      const matrices = {}
      for (const obj of data.objects ?? []) matrices[obj.id] = [...IDENTITY]
      return {
        objects: data.objects ?? [],
        nodes:   data.nodes ?? [],
        edges:   data.edges ?? [],
        clock:   { running: false, globalTime: 0, speed: 1 },
        matrices,
        sceneVersion: state.sceneVersion + 1,
      }
    }),
}))
