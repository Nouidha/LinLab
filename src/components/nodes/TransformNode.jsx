import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'
import NumInput from './NumInput'

export const TRANSFORM_CONFIGS = {
  rotationX:   { label: 'Rotation X',  color: '#7F77DD', params: [{ name: 'angle', min: -360, max: 360, step: 1,   default: 0 }] },
  rotationY:   { label: 'Rotation Y',  color: '#7F77DD', params: [{ name: 'angle', min: -360, max: 360, step: 1,   default: 0 }] },
  rotationZ:   { label: 'Rotation Z',  color: '#7F77DD', params: [{ name: 'angle', min: -360, max: 360, step: 1,   default: 0 }] },
  translation: { label: 'Translation', color: '#5DCAA5', params: [
    { name: 'x', min: -10, max: 10, step: 0.1, default: 0 },
    { name: 'y', min: -10, max: 10, step: 0.1, default: 0 },
    { name: 'z', min: -10, max: 10, step: 0.1, default: 0 },
    { name: 'scale', min: -10, max: 10, step: 0.1, default: 1 },
  ]},
  scale: { label: 'Scale', color: '#EF9F27', params: [
    { name: 'x', min: 0.1, max: 5, step: 0.05, default: 1 },
    { name: 'y', min: 0.1, max: 5, step: 0.05, default: 1 },
    { name: 'z', min: 0.1, max: 5, step: 0.05, default: 1 },
  ]},
  reflection: { label: 'Reflection',     color: '#F0997B', params: [] },
  composite:  { label: 'Composite (4×4)', color: '#888',   params: [] },
}

const REFLECTION_AXES = ['X', 'Y', 'Z', 'XY', 'XZ', 'YZ']

export default function TransformNode({ id, data }) {
  const updateNodeData = useSceneStore(s => s.updateNodeData)
  const cfg = TRANSFORM_CONFIGS[data.transformType] ?? TRANSFORM_CONFIGS.rotationY
  const { color } = cfg

  const setParam = (name, value) =>
    updateNodeData(id, { params: { ...data.params, [name]: value } })

  return (
    <div style={{
      background: '#16213e',
      borderLeft: `4px solid ${color}`,
      borderRadius: 8,
      minWidth: 180,
      fontFamily: 'sans-serif',
      fontSize: 12,
      color: '#e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        background: color + '22',
        borderBottom: `1px solid ${color}44`,
        padding: '5px 8px 5px 10px',
        fontWeight: 700,
        fontSize: 13,
        color: '#fff',
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ flex: 1 }}>{cfg.label}</span>
        <NodeDeleteBtn nodeId={id} />
      </div>

      {/* Params */}
      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.transformType === 'composite' ? (
          // 4×4 matrix grid
          <div>
            <div style={{ color: '#666', fontSize: 10, marginBottom: 4 }}>column-major (col0…col3)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
              {(data.params?.matrix ?? [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]).map((v, i) => (
                <NumInput
                  key={i}
                  className="nodrag nopan"
                  step={0.01}
                  value={v}
                  onChange={n => {
                    const m = [...(data.params?.matrix ?? [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])]
                    m[i] = n
                    setParam('matrix', m)
                  }}
                  style={{
                    width: '100%', background: '#0d1b2e', color: '#e0e0e0',
                    border: '1px solid #44444455', borderRadius: 3,
                    padding: '2px 3px', fontSize: 10, textAlign: 'center',
                  }}
                />
              ))}
            </div>
          </div>
        ) : data.transformType === 'reflection' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#888', minWidth: 28 }}>Axis</span>
            <select
              className="nodrag nopan"
              value={data.params?.axis ?? 'XY'}
              onChange={e => setParam('axis', e.target.value)}
              style={{ background: '#0d1b2e', color: '#e0e0e0', border: `1px solid ${color}55`, borderRadius: 4, padding: '2px 4px', fontSize: 11 }}
            >
              {REFLECTION_AXES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        ) : (
          cfg.params.map(p => {
            const val = data.params?.[p.name] ?? p.default
            return (
              <div key={p.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Per-param input handle for math node connections */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`param-${p.name}`}
                  style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
                />
                <span style={{ color: '#888', minWidth: 22, fontSize: 11 }}>{p.name}</span>
                <input
                  className="nodrag nopan"
                  type="range"
                  min={p.min} max={p.max} step={p.step}
                  value={val}
                  onChange={e => setParam(p.name, parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: color }}
                />
                <NumInput
                  className="nodrag nopan"
                  min={p.min} max={p.max} step={p.step}
                  value={val}
                  onChange={n => setParam(p.name, n)}
                  style={{
                    width: 44, background: '#0d1b2e', color: '#e0e0e0',
                    border: `1px solid ${color}55`, borderRadius: 4,
                    padding: '2px 4px', fontSize: 11, textAlign: 'right'
                  }}
                />
              </div>
            )
          })
        )}
      </div>

      <Handle type="target" position={Position.Left}  id="in"
        style={{ background: color, border: 'none', width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="out"
        style={{ background: color, border: 'none', width: 10, height: 10 }} />
    </div>
  )
}