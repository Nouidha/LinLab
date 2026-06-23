import { getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'

export default function DeletableEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  style,
  markerEnd,
}) {
  const removeEdge = useSceneStore(s => s.removeEdge)

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />

      <EdgeLabelRenderer>
        <button
          className="nodrag nopan"
          onClick={() => removeEdge(id)}
          title="Supprimer ce lien"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            width: 16, height: 16,
            borderRadius: '50%',
            background: '#1a1a2e',
            border: '1px solid #444',
            color: '#555',
            cursor: 'pointer',
            fontSize: 12,
            lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
            transition: 'border-color 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#e06c75'; e.currentTarget.style.color = '#e06c75' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#555' }}
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </>
  )
}
