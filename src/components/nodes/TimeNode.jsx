import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'

export default function TimeNode({ id }) {
  const globalTime = useSceneStore(s => s.clock.globalTime)

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
        <span style={{ flex: 1 }}>Time</span>
        <NodeDeleteBtn nodeId={id} />
      </div>
      <div style={{ padding: '8px 10px', fontSize: 11, color: '#888' }}>
        t = <span style={{ color: '#ccc' }}>{globalTime.toFixed(3)}</span> s
      </div>
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: '#888', border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
