import { useState } from 'react'
import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'

export default function ExpressionNode({ id, data }) {
  const updateNodeData = useSceneStore(s => s.updateNodeData)
  const globalTime     = useSceneStore(s => s.clock.globalTime)
  const [error, setError]   = useState(null)

  const expr = data.params?.expression ?? 't * 90'

  let preview = 0
  try {
    // eslint-disable-next-line no-new-func
    preview = new Function('t', 'PI', 'sin', 'cos', 'abs', 'floor', `return (${expr})`)(
      globalTime, Math.PI, Math.sin, Math.cos, Math.abs, Math.floor
    )
    if (isNaN(preview)) preview = 0
  } catch { preview = 0 }

  const handleChange = (val) => {
    setError(null)
    try {
      // eslint-disable-next-line no-new-func
      new Function('t', 'PI', 'sin', 'cos', 'abs', 'floor', `return (${val})`)(0, Math.PI, Math.sin, Math.cos, Math.abs, Math.floor)
      updateNodeData(id, { params: { expression: val } })
    } catch (e) {
      setError(e.message)
      updateNodeData(id, { params: { expression: val } })
    }
  }

  return (
    <div style={{
      background: '#16213e',
      border: '1px solid #555',
      borderLeft: '4px solid #888',
      borderRadius: 8,
      minWidth: 200,
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
        <span style={{ flex: 1 }}>Expression</span>
        <NodeDeleteBtn nodeId={id} />
      </div>
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 10, color: '#666' }}>f(t, PI, sin, cos, abs, floor)</div>
        <input
          className="nodrag nopan"
          type="text"
          value={expr}
          onChange={e => handleChange(e.target.value)}
          style={{
            background: '#0d1b2e', color: error ? '#f0997b' : '#e0e0e0',
            border: `1px solid ${error ? '#f0997b' : '#33334a'}`,
            borderRadius: 4, padding: '4px 6px', fontSize: 12, width: '100%',
            boxSizing: 'border-box', fontFamily: 'monospace',
          }}
        />
        {error && <div style={{ color: '#f0997b', fontSize: 10 }}>{error}</div>}
        <div style={{ fontSize: 10, color: '#666', borderTop: '1px solid #2a2a4a', paddingTop: 4 }}>
          out = <span style={{ color: '#aaa' }}>{typeof preview === 'number' ? preview.toFixed(3) : '?'}</span>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: '#888', border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
