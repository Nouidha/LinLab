import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'

export function computeVectorOp(a, b, op) {
  if (op === 'add')   return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
  if (op === 'sub')   return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
  if (op === 'cross') return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0],
  ]
  return [0, 0, 0]
}

function fmtNum(v) {
  const r = Math.round(v * 1000) / 1000
  return Number.isInteger(r) ? `${r}` : r.toFixed(2)
}

const COLOR = '#a78bfa'

export default function VectorOpNode({ id, data }) {
  const updateNodeData = useSceneStore(s => s.updateNodeData)
  const edges    = useSceneStore(s => s.edges)
  const objects  = useSceneStore(s => s.objects)
  const nodes    = useSceneStore(s => s.nodes)
  const matrices = useSceneStore(s => s.matrices)

  const p           = data.params ?? {}
  const operation   = p.operation  ?? 'add'
  const showResult  = p.showResult ?? true
  const resultColor = p.color      ?? COLOR

  const set = (key, val) => updateNodeData(id, { params: { ...p, [key]: val } })

  // Resolve vectors connected to vec-in-a and vec-in-b
  const edgeA = edges.find(e => e.target === id && e.targetHandle === 'vec-in-a')
  const edgeB = edges.find(e => e.target === id && e.targetHandle === 'vec-in-b')
  const srcA  = edgeA ? nodes.find(n => n.id === edgeA.source) : null
  const srcB  = edgeB ? nodes.find(n => n.id === edgeB.source) : null
  const vecA  = srcA?.data?.objectId ? objects.find(o => o.id === srcA.data.objectId) : null
  const vecB  = srcB?.data?.objectId ? objects.find(o => o.id === srcB.data.objectId) : null

  // Apply rotation/scale matrix to get the actual displayed direction
  const IDENT = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
  const applyMat3 = (m, v) => [
    m[0]*v[0]+m[4]*v[1]+m[8]*v[2],
    m[1]*v[0]+m[5]*v[1]+m[9]*v[2],
    m[2]*v[0]+m[6]*v[1]+m[10]*v[2],
  ]
  const tA = vecA ? applyMat3(matrices[vecA.id] ?? IDENT, [vecA.x??0, vecA.y??0, vecA.z??0]) : null
  const tB = vecB ? applyMat3(matrices[vecB.id] ?? IDENT, [vecB.x??0, vecB.y??0, vecB.z??0]) : null

  const result = tA && tB ? computeVectorOp(tA, tB, operation) : null

  const dot = tA && tB ? tA[0]*tB[0] + tA[1]*tB[1] + tA[2]*tB[2] : null
  const angle = (() => {
    if (dot === null || !tA || !tB) return null
    const lenA = Math.sqrt(tA[0]**2 + tA[1]**2 + tA[2]**2)
    const lenB = Math.sqrt(tB[0]**2 + tB[1]**2 + tB[2]**2)
    if (lenA < 1e-10 || lenB < 1e-10) return null
    return Math.acos(Math.max(-1, Math.min(1, dot / (lenA * lenB)))) * 180 / Math.PI
  })()

  const vecCoords = (v, t) => t
    ? `[${fmtNum(t[0])}, ${fmtNum(t[1])}, ${fmtNum(t[2])}]`
    : '—'

  const rowStyle = { position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }
  const handleStyle = { background: '#888', border: 'none', width: 7, height: 7, left: -18 }
  const inputStyle = {
    background: '#0d1b2e', color: '#e0e0e0',
    border: `1px solid ${COLOR}44`, borderRadius: 4,
    padding: '2px 6px', fontSize: 11,
  }

  return (
    <div style={{
      background: '#16213e',
      border: `1px solid ${COLOR}`,
      borderLeft: `4px solid ${COLOR}`,
      borderRadius: 8,
      minWidth: 220,
      fontFamily: 'sans-serif',
      fontSize: 12,
      color: '#e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        background: COLOR + '22', borderBottom: `1px solid ${COLOR}44`,
        padding: '5px 8px 5px 10px', fontWeight: 700, fontSize: 13,
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ flex: 1 }}>Vector Op</span>
        <NodeDeleteBtn nodeId={id} />
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* A input */}
        <div style={rowStyle}>
          <Handle type="target" position={Position.Left} id="vec-in-a" style={handleStyle} />
          <span style={{ color: '#888', fontSize: 11, minWidth: 16 }}>A</span>
          <span style={{ color: vecA ? vecA.color : '#444', fontSize: 10, fontFamily: 'monospace', flex: 1 }}>
            {vecCoords(vecA, tA)}
          </span>
        </div>

        {/* B input */}
        <div style={rowStyle}>
          <Handle type="target" position={Position.Left} id="vec-in-b" style={handleStyle} />
          <span style={{ color: '#888', fontSize: 11, minWidth: 16 }}>B</span>
          <span style={{ color: vecB ? vecB.color : '#444', fontSize: 10, fontFamily: 'monospace', flex: 1 }}>
            {vecCoords(vecB, tB)}
          </span>
        </div>

        {/* Operation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#888', fontSize: 11, minWidth: 16 }}>Op</span>
          <select className="nodrag nopan" value={operation}
            onChange={e => set('operation', e.target.value)}
            style={{ ...inputStyle, flex: 1 }}>
            <option value="add">A + B</option>
            <option value="sub">A − B</option>
            <option value="cross">A × B</option>
          </select>
        </div>

        <div style={{ height: 1, background: COLOR + '33' }} />

        {/* Result */}
        {result ? (
          <>
            <div style={{
              background: '#0a1020', border: `1px solid ${COLOR}33`,
              borderRadius: 5, padding: '5px 8px',
              fontFamily: 'monospace', fontSize: 11, color: COLOR, textAlign: 'center',
            }}>
              [{fmtNum(result[0])}, {fmtNum(result[1])}, {fmtNum(result[2])}]
              <span style={{ color: '#555', marginLeft: 6 }}>
                |r| = {fmtNum(Math.sqrt(result[0]**2 + result[1]**2 + result[2]**2))}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', flex: 1 }}>
                <input className="nodrag nopan" type="checkbox" checked={showResult}
                  onChange={e => set('showResult', e.target.checked)}
                  style={{ accentColor: COLOR }} />
                <span style={{ color: '#888', fontSize: 11 }}>Show</span>
              </label>
              <input className="nodrag nopan" type="color" value={resultColor}
                onChange={e => set('color', e.target.value)}
                style={{ width: 24, height: 18, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            </div>
          </>
        ) : (
          <div style={{ color: '#444', fontSize: 11, textAlign: 'center' }}>connect A and B</div>
        )}

        {/* Dot product + angle — shown whenever both vectors are connected */}
        {dot !== null && (
          <>
            <div style={{ height: 1, background: COLOR + '22' }} />

            <div style={rowStyle}>
              <Handle type="source" position={Position.Right} id="dot-out"
                style={{ background: '#888', border: 'none', width: 7, height: 7, right: -18 }} />
              <span style={{ color: '#888', fontSize: 10, flex: 1 }}>A · B</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#e0e0e0' }}>
                {fmtNum(dot)}
              </span>
            </div>

            <div style={rowStyle}>
              <Handle type="source" position={Position.Right} id="angle-out"
                style={{ background: '#888', border: 'none', width: 7, height: 7, right: -18 }} />
              <span style={{ color: '#888', fontSize: 10, flex: 1 }}>∠(A, B)</span>
              <span style={{
                fontFamily: 'monospace', fontSize: 10,
                color: angle !== null && Math.abs(angle - 90) < 0.5 ? '#5DCAA5' : '#e0e0e0',
                fontWeight: angle !== null && Math.abs(angle - 90) < 0.5 ? 700 : 400,
              }}>
                {angle !== null ? fmtNum(angle) + '°' : '—'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Single vector output */}
      <Handle type="source" position={Position.Right} id="vec-out"
        style={{ background: COLOR, border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
