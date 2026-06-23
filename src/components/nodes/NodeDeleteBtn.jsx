import { useSceneStore } from '../../store/useSceneStore'

export default function NodeDeleteBtn({ nodeId }) {
  const removeNode = useSceneStore(s => s.removeNode)
  return (
    <button
      onClick={() => removeNode(nodeId)}
      title="Supprimer ce nœud"
      style={{
        background: 'transparent', border: 'none',
        color: '#444', cursor: 'pointer',
        fontSize: 15, lineHeight: 1, padding: '0 2px',
        transition: 'color 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#e06c75'}
      onMouseLeave={e => e.currentTarget.style.color = '#444'}
    >
      ×
    </button>
  )
}
