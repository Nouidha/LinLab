import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, { Background, Controls } from 'reactflow'
import 'reactflow/dist/style.css'
import DeletableEdge from './edges/DeletableEdge'

import { useSceneStore, newNodeId } from '../store/useSceneStore'
import ObjectNode from './nodes/ObjectNode'
import TransformNode, { TRANSFORM_CONFIGS } from './nodes/TransformNode'
import TimeNode from './nodes/TimeNode'
import WaveformNode from './nodes/WaveformNode'
import ScalarNode from './nodes/ScalarNode'
import ExpressionNode from './nodes/ExpressionNode'
import VectorOpNode from './nodes/VectorOpNode'
import ProjectionNode from './nodes/ProjectionNode'

const NODE_TYPES = {
  objectNode:     ObjectNode,
  transformNode:  TransformNode,
  timeNode:       TimeNode,
  waveformNode:   WaveformNode,
  scalarNode:     ScalarNode,
  expressionNode: ExpressionNode,
  vectorOpNode:    VectorOpNode,
  pointOnLineNode:  ProjectionNode,
  pointOnPlaneNode: ProjectionNode,
}

const EDGE_TYPES = { default: DeletableEdge }

// ── Edge styling ──────────────────────────────────────────────────────────────

function edgeStyle(targetHandle, animated) {
  const isParam = targetHandle?.startsWith('param-') || targetHandle?.startsWith('plane-')
    || targetHandle?.startsWith('point-') || targetHandle?.startsWith('vec-')
    || targetHandle?.startsWith('cone-') || targetHandle?.startsWith('cube-')
    || targetHandle?.startsWith('cylinder-') || targetHandle?.startsWith('line-')
    || targetHandle?.startsWith('proj-') || targetHandle === 'point-in'
    || targetHandle === 'seg-a' || targetHandle === 'seg-b'
  return {
    markerEnd: {
      type: 'arrowclosed',
      color: isParam ? '#556' : '#8b82ee',
      width: isParam ? 10 : 16,
      height: isParam ? 10 : 16,
    },
    style: isParam
      ? { stroke: '#556', strokeWidth: 1.5, strokeDasharray: '5 3' }
      : { stroke: '#8b82ee', strokeWidth: 2.5 },
    animated: !isParam && animated,
  }
}

const MATH_TYPES = new Set(['timeNode', 'scalarNode', 'expressionNode', 'waveformNode'])

// ── TabBar ────────────────────────────────────────────────────────────────────

function TabBar() {
  const tabs        = useSceneStore(s => s.tabs)
  const activeTabId = useSceneStore(s => s.activeTabId)
  const switchTab   = useSceneStore(s => s.switchTab)
  const closeTab    = useSceneStore(s => s.closeTab)
  const createTab   = useSceneStore(s => s.createTab)
  const renameTab   = useSceneStore(s => s.renameTab)

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      background: '#0a1020', borderBottom: '1px solid #1e2a4a',
      height: 34, flexShrink: 0, overflowX: 'auto', overflowY: 'hidden',
    }}>
      {tabs.map(tab => {
        const active = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0 10px 0 12px', cursor: 'pointer', flexShrink: 0,
              background: active ? '#12192e' : 'transparent',
              borderRight: '1px solid #1e2a4a',
              borderBottom: active ? '2px solid #7F77DD' : '2px solid transparent',
              color: active ? '#e0e0e0' : '#555',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#888' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#555' }}
          >
            <input
              className="nodrag nopan"
              value={tab.label}
              onChange={e => renameTab(tab.id, e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                color: 'inherit', fontSize: 11, fontFamily: 'sans-serif',
                cursor: active ? 'text' : 'pointer',
                width: `${Math.max(40, tab.label.length * 7)}px`,
              }}
            />
            {tabs.length > 1 && (
              <button
                onClick={e => { e.stopPropagation(); closeTab(tab.id) }}
                style={{
                  background: 'transparent', border: 'none', color: '#444',
                  cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '0 2px',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#e06c75'}
                onMouseLeave={e => e.currentTarget.style.color = '#444'}
              >×</button>
            )}
          </div>
        )
      })}

      {/* New empty tab */}
      <button
        onClick={() => createTab('Scene', { objects: [], nodes: [], edges: [] })}
        title="New scene"
        style={{
          background: 'transparent', border: 'none', borderRight: '1px solid #1e2a4a',
          color: '#444', cursor: 'pointer', fontSize: 16, padding: '0 12px',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#7F77DD'}
        onMouseLeave={e => e.currentTarget.style.color = '#444'}
      >+</button>
    </div>
  )
}

// ── NodeCanvas ────────────────────────────────────────────────────────────────

export default function NodeCanvas() {
  const nodes              = useSceneStore(s => s.nodes)
  const edges              = useSceneStore(s => s.edges)
  const isRunning          = useSceneStore(s => s.clock.running)
  const sceneVersion       = useSceneStore(s => s.sceneVersion)
  const onNodesChange      = useSceneStore(s => s.onNodesChange)
  const onEdgesChange      = useSceneStore(s => s.onEdgesChange)
  const storeConnect       = useSceneStore(s => s.onConnect)
  const addNode            = useSceneStore(s => s.addNode)
  const addObjectWithNode  = useSceneStore(s => s.addObjectWithNode)

  const wrapperRef           = useRef(null)
  const [rfInstance, setRfInstance] = useState(null)
  const objects              = useSceneStore(s => s.objects)
  const setSelectedObjectId  = useSceneStore(s => s.setSelectedObjectId)

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    const objNode = sel.find(n => n.type === 'objectNode')
    setSelectedObjectId(objNode?.data?.objectId ?? null)
  }, [setSelectedObjectId])

  const isValidConnection = useCallback((connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    if (!sourceNode) return false
    const isMathSource   = MATH_TYPES.has(sourceNode.type)
    const isVecOpSource  = sourceNode.type === 'vectorOpNode'
    const { targetHandle, sourceHandle } = connection

    // Projection node: point-in accepts only a projection node's point-out
    if (targetHandle === 'point-in') {
      const isProj = sourceNode.type === 'pointOnLineNode' || sourceNode.type === 'pointOnPlaneNode'
      return isProj && sourceHandle === 'point-out'
    }

    // Segment: seg-a and seg-b accept Point objectNodes
    if (targetHandle === 'seg-a' || targetHandle === 'seg-b') {
      if (sourceNode.type !== 'objectNode') return false
      const obj = objects.find(o => o.id === sourceNode.data?.objectId)
      return obj?.type === 'point'
    }

    // Projection node: proj-point-in accepts a Point objectNode
    if (targetHandle === 'proj-point-in') {
      if (sourceNode.type !== 'objectNode') return false
      const obj = objects.find(o => o.id === sourceNode.data?.objectId)
      return obj?.type === 'point'
    }

    // Projection node: proj-onto-in accepts Line or Plane depending on node type
    if (targetHandle === 'proj-onto-in') {
      if (sourceNode.type !== 'objectNode') return false
      const targetNode = nodes.find(n => n.id === connection.target)
      const obj = objects.find(o => o.id === sourceNode.data?.objectId)
      if (targetNode?.type === 'pointOnLineNode')  return obj?.type === 'line'
      if (targetNode?.type === 'pointOnPlaneNode') return obj?.type === 'plane'
      return false
    }

    // VectorOp vector inputs: only from vector objectNodes
    if (targetHandle === 'vec-in-a' || targetHandle === 'vec-in-b') {
      if (sourceNode.type !== 'objectNode') return false
      const obj = objects.find(o => o.id === sourceNode.data?.objectId)
      return obj?.type === 'vector'
    }

    // Vector result input: only from VectorOpNode's vec-out
    if (targetHandle === 'vec-in') return isVecOpSource && sourceHandle === 'vec-out'

    // Transform chain: only non-math, non-vecOp nodes
    if (targetHandle === 'in') {
      if (isMathSource || isVecOpSource) return false
      // Scale and composite are not applicable to lines
      if (sourceNode.type === 'objectNode') {
        const srcObj = objects.find(o => o.id === sourceNode.data?.objectId)
        if (srcObj?.type === 'line') {
          const targetNode = nodes.find(n => n.id === connection.target)
          const tt = targetNode?.data?.transformType
          if (tt === 'scale' || tt === 'composite') return false
        }
      }
      return true
    }

    // Waveform time input: only scalar math nodes
    if (targetHandle === 'time-in') return isMathSource

    // Scalar outputs from VectorOpNode (dot, angle) act like math node outputs
    const isScalarVecOut = isVecOpSource && (sourceHandle === 'dot-out' || sourceHandle === 'angle-out')

    // dist-out from projection nodes acts like a scalar math output
    const isProjScalar = (sourceNode.type === 'pointOnLineNode' || sourceNode.type === 'pointOnPlaneNode')
      && sourceHandle === 'dist-out'

    // All other parameter inputs: scalar math nodes, scalar vec-op, or projection scalar outputs
    return isMathSource || isScalarVecOut || isProjScalar
  }, [nodes, objects])

  // Re-fit the view whenever a scene is loaded
  useEffect(() => {
    if (!rfInstance) return
    const id = setTimeout(() => rfInstance.fitView({ padding: 0.25, duration: 300 }), 60)
    return () => clearTimeout(id)
  }, [sceneVersion, rfInstance])

  // Inject arrow markers + animated flag at render time (not stored)
  const styledEdges = useMemo(() =>
    edges.map(e => ({ ...e, ...edgeStyle(e.targetHandle, isRunning) })),
  [edges, isRunning])

  // ── Drop from LeftPanel ───────────────────────────────────────────────────

  const onDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('application/linlab')
    if (!raw || !rfInstance) return

    // Convert screen coords → flow coords
    const position = rfInstance.screenToFlowPosition
      ? rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY })
      : (() => {
          const b = wrapperRef.current.getBoundingClientRect()
          return rfInstance.project({ x: e.clientX - b.left, y: e.clientY - b.top })
        })()

    const { category, objectType, transformType, nodeType, defaultData } = JSON.parse(raw)

    if (category === 'object') {
      addObjectWithNode(objectType, position)

    } else if (category === 'transform') {
      const cfg = TRANSFORM_CONFIGS[transformType]
      const params = {}
      for (const p of cfg.params) params[p.name] = p.default
      if (transformType === 'reflection') params.axis = 'XY'
      if (transformType === 'composite')  params.matrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
      addNode({
        id: newNodeId(transformType),
        type: 'transformNode',
        position,
        data: { transformType, label: cfg.label, params },
      })

    } else if (category === 'math') {
      addNode({
        id: newNodeId(nodeType),
        type: nodeType,
        position,
        data: defaultData,
      })
    }
  }, [rfInstance, addObjectWithNode, addNode])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TabBar />
      <div ref={wrapperRef} style={{ flex: 1, minHeight: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={storeConnect}
        isValidConnection={isValidConnection}
        onSelectionChange={onSelectionChange}
        onInit={setRfInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={['Delete', 'Backspace']}
        connectionLineStyle={{ stroke: '#8b82ee', strokeWidth: 2 }}
        defaultEdgeOptions={{
          markerEnd: { type: 'arrowclosed', color: '#8b82ee', width: 16, height: 16 },
          style: { stroke: '#8b82ee', strokeWidth: 2.5 },
        }}
      >
        <Background color="#2a2a4a" gap={20} variant="dots" />
        <Controls style={{ bottom: 8, left: 8 }} />
      </ReactFlow>
      </div>
    </div>
  )
}
