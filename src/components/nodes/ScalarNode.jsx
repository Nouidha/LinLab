import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'
import NumInput from './NumInput'

export default function ScalarNode({ id, data }) {
  const updateNodeData = useSceneStore(s => s.updateNodeData)
  const val = data.params?.value ?? 0

  return (
    <div style={{
      background: '#16213e',
      border: '1px solid #555',
      borderLeft: '4px solid #888',
      borderRadius: 8,
      minWidth: 130,
      fontFamily: 'sans-serif',
      color: '#e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        background: '#88888822',
        borderBottom: '1px solid #55555544',
        padding: '5px 8px 5px 10px',
        fontWeight: 700, fontSize: 13, color: '#aaa',
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ flex: 1 }}>Scalar</span>
        <NodeDeleteBtn nodeId={id} />
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#888', fontSize: 11 }}>value</span>
        <NumInput
          className="nodrag nopan"
          value={val}
          step={0.1}
          onChange={n => updateNodeData(id, { params: { value: n } })}
          style={{
            flex: 1, background: '#0d1b2e', color: '#e0e0e0',
            border: '1px solid #55555555', borderRadius: 4,
            padding: '2px 4px', fontSize: 11, textAlign: 'right',
          }}
        />
      </div>
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: '#888', border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
