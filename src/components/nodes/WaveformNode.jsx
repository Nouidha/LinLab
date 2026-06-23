import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'

const WAVEFORMS = ['sin', 'cos', 'sawtooth']

const BTN_STYLE = (active) => ({
  padding: '2px 7px',
  borderRadius: 4,
  border: `1px solid ${active ? '#888' : '#333'}`,
  background: active ? '#2a2a4a' : 'transparent',
  color: active ? '#ccc' : '#555',
  cursor: 'pointer',
  fontSize: 10,
})

export default function WaveformNode({ id, data }) {
  const updateNodeData = useSceneStore(s => s.updateNodeData)
  const globalTime     = useSceneStore(s => s.clock.globalTime)

  const p = data.params ?? { type: 'sin', amplitude: 1, frequency: 1, phase: 0 }

  const setP = (key, val) => updateNodeData(id, { params: { ...p, [key]: val } })

  // Preview output value
  const t = globalTime * p.frequency + (p.phase ?? 0)
  const preview = (() => {
    switch (p.type) {
      case 'sin':      return Math.sin(t * 2 * Math.PI)
      case 'cos':      return Math.cos(t * 2 * Math.PI)
      case 'sawtooth': return ((t % 1) + 1) % 1 * 2 - 1
      default:         return 0
    }
  })() * (p.amplitude ?? 1)

  return (
    <div style={{
      background: '#16213e',
      border: '1px solid #555',
      borderLeft: '4px solid #888',
      borderRadius: 8,
      minWidth: 170,
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
        <span style={{ flex: 1 }}>Waveform</span>
        <NodeDeleteBtn nodeId={id} />
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Type buttons */}
        <div style={{ display: 'flex', gap: 4 }}>
          {WAVEFORMS.map(w => (
            <button key={w} style={BTN_STYLE(p.type === w)} onClick={() => setP('type', w)}>{w}</button>
          ))}
        </div>

        {[
          { key: 'amplitude', label: 'amp',  min: 0,  max: 200, step: 1  },
          { key: 'frequency', label: 'freq', min: 0.01, max: 10, step: 0.01 },
          { key: 'phase',     label: 'φ',    min: 0,  max: 1,   step: 0.01 },
        ].map(({ key, label, min, max, step }) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#888', minWidth: 28, fontSize: 10 }}>{label}</span>
            <input
              type="range" min={min} max={max} step={step}
              value={p[key] ?? (key === 'amplitude' ? 1 : key === 'frequency' ? 1 : 0)}
              className="nodrag nopan"
              onChange={e => setP(key, parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: '#888' }}
            />
            <span style={{ fontSize: 10, color: '#aaa', minWidth: 32, textAlign: 'right' }}>
              {(p[key] ?? 0).toFixed(2)}
            </span>
          </div>
        ))}

        <div style={{ fontSize: 10, color: '#666', borderTop: '1px solid #2a2a4a', paddingTop: 4 }}>
          out = <span style={{ color: '#aaa' }}>{preview.toFixed(3)}</span>
        </div>
      </div>

      <Handle type="target" position={Position.Left}  id="time-in"
        style={{ background: '#888', border: 'none', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: '#888', border: 'none', width: 10, height: 10 }} />
    </div>
  )
}