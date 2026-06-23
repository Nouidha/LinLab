import { useState } from 'react'
import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import { det3 } from '../../utils/matrices'
import NumInput from './NumInput'

const TYPE_ICONS = {
  cube: '■', sphere: '●', torus: '⊙', plane: '▭', cone: '▲',
  cylinder: '⬡', line: '↔', point: '•', vector: '→', segment: '—',
}

// ── Plane equation formatter ──────────────────────────────────────────────────
// Produces e.g.  "x + 2y − 3z = 5"  from normal=[1,2,-3], distance=5
function formatPlaneEq(normal, distance) {
  const axes = ['x', 'y', 'z']
  const terms = []

  normal.forEach((v, i) => {
    const r = Math.round(v * 1000) / 1000
    if (Math.abs(r) < 0.0001) return
    const abs = Math.abs(r)
    const coef = Math.abs(abs - 1) < 0.0001 ? '' : (Number.isInteger(abs) ? `${abs}` : abs.toFixed(2))
    terms.push({ sign: r < 0 ? -1 : 1, str: `${coef}${axes[i]}` })
  })

  if (!terms.length) return `0 = ${fmtNum(distance)}`

  return terms.reduce((acc, t, i) => {
    const op = i === 0 ? (t.sign < 0 ? '−' : '') : (t.sign < 0 ? ' − ' : ' + ')
    return acc + op + t.str
  }, '') + ` = ${fmtNum(distance)}`
}

function fmtNum(v) {
  const r = Math.round(v * 1000) / 1000
  return Number.isInteger(r) ? `${r}` : r.toFixed(2)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ObjectNode({ id, data }) {
  const updateObject   = useSceneStore(s => s.updateObject)
  const updateNodeData = useSceneStore(s => s.updateNodeData)
  const removeObject   = useSceneStore(s => s.removeObject)
  const obj    = useSceneStore(s => s.objects.find(o => o.id === data.objectId))
  const matrix = useSceneStore(s => s.matrices[data.objectId])
  const edges  = useSceneStore(s => s.edges)
  const nodes  = useSceneStore(s => s.nodes)
  const [showMatrix, setShowMatrix] = useState(false)

  if (!obj) return null

  const isPlane    = obj.type === 'plane'
  const isSphere   = obj.type === 'sphere'
  const isCone     = obj.type === 'cone'
  const isCylinder = obj.type === 'cylinder'
  const isCube     = obj.type === 'cube'
  const isLine     = obj.type === 'line'
  const isPoint    = obj.type === 'point'
  const isVector   = obj.type === 'vector'
  const isSegment  = obj.type === 'segment'

  const segANode = isSegment ? nodes.find(n => n.id === edges.find(e => e.target === id && e.targetHandle === 'seg-a')?.source) : null
  const segBNode = isSegment ? nodes.find(n => n.id === edges.find(e => e.target === id && e.targetHandle === 'seg-b')?.source) : null
  const normal   = obj.normal   ?? [0, 1, 0]
  const distance = obj.distance ?? 0

  const setNormal = (axis, val) => {
    const n = [...normal]
    n[axis] = val
    updateObject(obj.id, { normal: n })
  }

  return (
    <div style={{
      background: '#16213e',
      border: `2px solid ${obj.color}`,
      borderRadius: 8,
      minWidth: (isPlane || isCone || isCylinder || isCube || isLine || isPoint || isVector || isSegment) ? 200 : 150,
      fontFamily: 'sans-serif',
      fontSize: 12,
      color: '#e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      {/* Header */}
      <div style={{
        background: obj.color + '22',
        borderBottom: `1px solid ${obj.color}44`,
        padding: '5px 10px',
        display: 'flex', alignItems: 'center', gap: 6,
        fontWeight: 700, fontSize: 13,
      }}>
        <span style={{ fontSize: 16 }}>{TYPE_ICONS[obj.type] ?? '▪'}</span>
        <input
          className="nodrag nopan"
          value={data.label}
          onChange={e => updateNodeData(id, { label: e.target.value })}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#fff', fontWeight: 700, fontSize: 13, fontFamily: 'sans-serif',
            cursor: 'text', minWidth: 0,
          }}
        />
        <button
          onClick={() => removeObject(obj.id)}
          title="Remove object"
          style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#e06c75'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >×</button>
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Color */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: '#888', fontSize: 11 }}>Color</span>
          <input className="nodrag nopan" type="color" value={obj.color}
            onChange={e => updateObject(obj.id, { color: e.target.value })}
            style={{ width: 24, height: 18, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
        </div>

        {/* Wireframe — not applicable to point/vector/line/segment */}
        {!isPoint && !isVector && !isLine && !isSegment && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input className="nodrag nopan" type="checkbox" checked={obj.wireframe}
              onChange={e => updateObject(obj.id, { wireframe: e.target.checked })}
              style={{ accentColor: obj.color }} />
            <span style={{ color: '#888', fontSize: 11 }}>Wireframe</span>
          </label>
        )}

        {/* Show basis vectors */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input className="nodrag nopan" type="checkbox" checked={obj.showBasis ?? false}
            onChange={e => updateObject(obj.id, { showBasis: e.target.checked })}
            style={{ accentColor: obj.color }} />
          <span style={{ color: '#888', fontSize: 11 }}>Show basis</span>
        </label>

        {/* ── Plane-specific ── */}
        {isPlane && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            {/* Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>Size</span>
              <NumInput
                className="nodrag nopan"
                min={0.5} step={0.5}
                value={obj.size ?? 3}
                onChange={v => updateObject(obj.id, { size: Math.max(0.5, v) })}
                style={{
                  flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                  border: `1px solid ${obj.color}44`, borderRadius: 4,
                  padding: '2px 6px', fontSize: 11, textAlign: 'right',
                }}
              />
            </div>

            {/* Normal vector — one row per component with input handle */}
            {['x', 'y', 'z'].map((axis, i) => (
              <div key={axis} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`plane-n${axis}`}
                  style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
                />
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>n{axis}</span>
                <NumInput
                  className="nodrag nopan"
                  step={0.1}
                  value={normal[i]}
                  onChange={v => setNormal(i, v)}
                  style={{
                    flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                    border: `1px solid ${obj.color}44`, borderRadius: 4,
                    padding: '2px 6px', fontSize: 11, textAlign: 'right',
                  }}
                />
              </div>
            ))}

            {/* Distance */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Handle
                type="target"
                position={Position.Left}
                id="plane-dist"
                style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
              />
              <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>Dist</span>
              <NumInput
                className="nodrag nopan"
                step={0.1}
                value={distance}
                onChange={v => updateObject(obj.id, { distance: v })}
                style={{
                  flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                  border: `1px solid ${obj.color}44`, borderRadius: 4,
                  padding: '2px 6px', fontSize: 11, textAlign: 'right',
                }}
              />
            </div>

            {/* Show normal toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input className="nodrag nopan" type="checkbox" checked={obj.showNormal ?? false}
                onChange={e => updateObject(obj.id, { showNormal: e.target.checked })}
                style={{ accentColor: obj.color }} />
              <span style={{ color: '#888', fontSize: 11 }}>Show normal</span>
            </label>

            {/* Opacity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>Opacity</span>
              <input
                className="nodrag nopan"
                type="range" min={0.05} max={1} step={0.05}
                value={obj.opacity ?? 1}
                onChange={e => updateObject(obj.id, { opacity: parseFloat(e.target.value) })}
                style={{ flex: 1, accentColor: obj.color }}
              />
              <span style={{ color: '#888', fontSize: 10, minWidth: 26, textAlign: 'right' }}>
                {Math.round((obj.opacity ?? 1) * 100)}%
              </span>
            </div>

            {/* Parametric equation */}
            <div style={{
              background: '#0a1020',
              border: `1px solid ${obj.color}33`,
              borderRadius: 5,
              padding: '5px 8px',
              fontFamily: 'monospace',
              fontSize: 12,
              color: obj.color,
              textAlign: 'center',
              letterSpacing: '0.03em',
            }}>
              {formatPlaneEq(normal, distance)}
            </div>
          </>
        )}

        {/* ── Point-specific ── */}
        {isPoint && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            {/* Full position input from a projection node */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Handle type="target" position={Position.Left} id="point-in"
                style={{ background: '#f4c542', border: 'none', width: 9, height: 9, left: -18 }} />
              <span style={{ color: '#f4c542', fontSize: 10 }}>P in</span>
            </div>
            <div style={{ height: 1, background: obj.color + '22', margin: '1px 0' }} />

            {['x', 'y', 'z'].map(axis => (
              <div key={axis} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`point-${axis}`}
                  style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
                />
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{axis}</span>
                <NumInput
                  className="nodrag nopan"
                  step={0.1}
                  value={obj[axis] ?? 0}
                  onChange={v => updateObject(obj.id, { [axis]: v })}
                  style={{
                    flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                    border: `1px solid ${obj.color}44`, borderRadius: 4,
                    padding: '2px 6px', fontSize: 11, textAlign: 'right',
                  }}
                />
              </div>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input className="nodrag nopan" type="checkbox" checked={obj.showLabel ?? false}
                onChange={e => updateObject(obj.id, { showLabel: e.target.checked })}
                style={{ accentColor: obj.color }} />
              <span style={{ color: '#888', fontSize: 11 }}>Show label</span>
            </label>
          </>
        )}

        {/* ── Vector-specific ── */}
        {isVector && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            {/* Full vector input from VectorOpNode */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Handle
                type="target"
                position={Position.Left}
                id="vec-in"
                style={{ background: '#a78bfa', border: 'none', width: 9, height: 9, left: -18 }}
              />
              <span style={{ color: '#a78bfa', fontSize: 10 }}>v⃗ in</span>
            </div>
            <div style={{ height: 1, background: obj.color + '22', margin: '1px 0' }} />

            {['x', 'y', 'z'].map((axis, i) => (
              <div key={axis} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`vec-${axis}`}
                  style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
                />
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{axis}</span>
                <NumInput
                  className="nodrag nopan"
                  step={0.1}
                  value={obj[axis] ?? (i === 0 ? 1 : 0)}
                  onChange={v => updateObject(obj.id, { [axis]: v })}
                  style={{
                    flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                    border: `1px solid ${obj.color}44`, borderRadius: 4,
                    padding: '2px 6px', fontSize: 11, textAlign: 'right',
                  }}
                />
              </div>
            ))}
            <div style={{
              background: '#0a1020', border: `1px solid ${obj.color}33`,
              borderRadius: 5, padding: '4px 8px',
              fontFamily: 'monospace', fontSize: 11, color: obj.color, textAlign: 'center',
            }}>
              {`|v| = ${fmtNum(Math.sqrt((obj.x ?? 1) ** 2 + (obj.y ?? 0) ** 2 + (obj.z ?? 0) ** 2))}`}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input className="nodrag nopan" type="checkbox" checked={obj.showLabel ?? false}
                onChange={e => updateObject(obj.id, { showLabel: e.target.checked })}
                style={{ accentColor: obj.color }} />
              <span style={{ color: '#888', fontSize: 11 }}>Show label</span>
            </label>
          </>
        )}

        {/* ── Line-specific ── */}
        {isLine && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            <div style={{ color: '#888', fontSize: 10, padding: '1px 0' }}>Point</div>
            {[
              { label: 'x', key: 'px', def: 0 },
              { label: 'y', key: 'py', def: 0 },
              { label: 'z', key: 'pz', def: 0 },
            ].map(({ label, key, def }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{label}</span>
                <NumInput className="nodrag nopan" step={0.1}
                  value={obj[key] ?? def}
                  onChange={v => updateObject(obj.id, { [key]: v })}
                  style={{ flex: 1, background: '#0d1b2e', color: '#e0e0e0', border: `1px solid ${obj.color}44`, borderRadius: 4, padding: '2px 6px', fontSize: 11, textAlign: 'right' }}
                />
              </div>
            ))}

            <div style={{ height: 1, background: obj.color + '22', margin: '4px 0' }} />

            <div style={{ color: '#888', fontSize: 10, padding: '1px 0' }}>Direction</div>
            {[
              { label: 'x', key: 'dx', def: 1 },
              { label: 'y', key: 'dy', def: 0 },
              { label: 'z', key: 'dz', def: 0 },
            ].map(({ label, key, def }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{label}</span>
                <NumInput className="nodrag nopan" step={0.1}
                  value={obj[key] ?? def}
                  onChange={v => updateObject(obj.id, { [key]: v })}
                  style={{ flex: 1, background: '#0d1b2e', color: '#e0e0e0', border: `1px solid ${obj.color}44`, borderRadius: 4, padding: '2px 6px', fontSize: 11, textAlign: 'right' }}
                />
              </div>
            ))}

            <div style={{
              background: '#0a1020', border: `1px solid ${obj.color}33`,
              borderRadius: 5, padding: '5px 8px', fontFamily: 'monospace',
              fontSize: 10, color: obj.color, lineHeight: 1.6,
            }}>
              <div>P = ({fmtNum(obj.px ?? 0)}, {fmtNum(obj.py ?? 0)}, {fmtNum(obj.pz ?? 0)})</div>
              <div>d = ({fmtNum(obj.dx ?? 1)}, {fmtNum(obj.dy ?? 0)}, {fmtNum(obj.dz ?? 0)})</div>
            </div>
          </>
        )}

        {/* ── Sphere-specific ── */}
        {isSphere && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Handle type="target" position={Position.Left} id="sphere-radius"
                style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }} />
              <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>Radius</span>
              <NumInput
                className="nodrag nopan"
                min={0.1} step={0.1}
                value={obj.radius ?? 1}
                onChange={v => updateObject(obj.id, { radius: Math.max(0.1, v) })}
                style={{
                  flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                  border: `1px solid ${obj.color}44`, borderRadius: 4,
                  padding: '2px 6px', fontSize: 11, textAlign: 'right',
                }}
              />
            </div>
          </>
        )}

        {/* ── Cube-specific ── */}
        {isCube && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Handle type="target" position={Position.Left} id="cube-size"
                style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }} />
              <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>Size</span>
              <NumInput
                className="nodrag nopan"
                min={0.1} step={0.1}
                value={obj.size ?? 2}
                onChange={v => updateObject(obj.id, { size: Math.max(0.1, v) })}
                style={{
                  flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                  border: `1px solid ${obj.color}44`, borderRadius: 4,
                  padding: '2px 6px', fontSize: 11, textAlign: 'right',
                }}
              />
            </div>
          </>
        )}

        {/* ── Cone-specific ── */}
        {isCone && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            {[
              { id: 'cone-radius', label: 'Radius', key: 'radius', min: 0.1, step: 0.1 },
              { id: 'cone-height', label: 'Height', key: 'height', min: 0.1, step: 0.1 },
            ].map(({ id, label, key, min, step }) => (
              <div key={id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={id}
                  style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
                />
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{label}</span>
                <NumInput
                  className="nodrag nopan"
                  min={min} step={step}
                  value={obj[key] ?? (key === 'radius' ? 1 : 2)}
                  onChange={v => updateObject(obj.id, { [key]: Math.max(min, v) })}
                  style={{
                    flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                    border: `1px solid ${obj.color}44`, borderRadius: 4,
                    padding: '2px 6px', fontSize: 11, textAlign: 'right',
                  }}
                />
              </div>
            ))}
          </>
        )}

        {/* ── Cylinder-specific ── */}
        {isCylinder && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            {[
              { id: 'cylinder-radius', label: 'Radius', key: 'radius', min: 0.1, step: 0.1 },
              { id: 'cylinder-height', label: 'Height', key: 'height', min: 0.1, step: 0.1 },
            ].map(({ id, label, key, min, step }) => (
              <div key={id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Handle
                  type="target"
                  position={Position.Left}
                  id={id}
                  style={{ background: '#888', border: 'none', width: 7, height: 7, left: -18 }}
                />
                <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{label}</span>
                <NumInput
                  className="nodrag nopan"
                  min={min} step={step}
                  value={obj[key] ?? (key === 'radius' ? 1 : 2)}
                  onChange={v => updateObject(obj.id, { [key]: Math.max(min, v) })}
                  style={{
                    flex: 1, background: '#0d1b2e', color: '#e0e0e0',
                    border: `1px solid ${obj.color}44`, borderRadius: 4,
                    padding: '2px 6px', fontSize: 11, textAlign: 'right',
                  }}
                />
              </div>
            ))}
          </>
        )}
        {/* ── Segment-specific ── */}
        {isSegment && (
          <>
            <div style={{ height: 1, background: obj.color + '33', margin: '2px 0' }} />

            {[
              { handle: 'seg-a', label: 'Point A', node: segANode },
              { handle: 'seg-b', label: 'Point B', node: segBNode },
            ].map(({ handle, label, node }) => (
              <div key={handle} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Handle type="target" position={Position.Left} id={handle}
                  style={{ background: '#a0c4ff', border: 'none', width: 8, height: 8, left: -18 }} />
                <span style={{ color: '#888', fontSize: 11, minWidth: 50 }}>{label}</span>
                <span style={{ color: node ? '#a0c4ff' : '#333', fontSize: 10, fontFamily: 'monospace', flex: 1 }}>
                  {node?.data?.label ?? '—'}
                </span>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── Matrix display ── */}
      <div style={{ borderTop: `1px solid ${obj.color}33` }}>
        <button
          className="nodrag nopan"
          onClick={() => setShowMatrix(v => !v)}
          style={{
            width: '100%', background: 'transparent', border: 'none',
            color: '#555', cursor: 'pointer', fontSize: 10,
            padding: '4px 10px', textAlign: 'left', display: 'flex',
            alignItems: 'center', gap: 4,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#888'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >
          <span>{showMatrix ? '▾' : '▸'}</span> Matrix 4×4
        </button>

        {showMatrix && matrix && (
          <div style={{ padding: '0 8px 8px', userSelect: 'text' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2,
            }}>
              {[0, 1, 2, 3].map(row =>
                [0, 1, 2, 3].map(col => {
                  const val = matrix[row + col * 4]
                  // col 3 = translation; row 3 = homogeneous bottom row
                  const isTranslation = col === 3 && row < 3
                  const isHomogeneous = row === 3
                  return (
                    <div
                      key={`${row}-${col}`}
                      style={{
                        background: '#0a1020',
                        border: `1px solid ${isTranslation ? obj.color + '55' : '#1e2a4a'}`,
                        borderRadius: 3,
                        padding: '2px 3px',
                        fontFamily: 'monospace',
                        fontSize: 9,
                        textAlign: 'right',
                        color: isHomogeneous ? '#333'
                          : isTranslation  ? obj.color
                          : '#9ab',
                      }}
                    >
                      {Math.abs(val) < 1e-10 ? '0' : val.toFixed(2)}
                    </div>
                  )
                })
              )}
            </div>
            <div style={{ fontSize: 9, color: '#333', marginTop: 4, textAlign: 'right' }}>
              <span style={{ color: '#9ab' }}>■</span> rot/scale &nbsp;
              <span style={{ color: obj.color }}>■</span> translation
            </div>
            {(() => {
              const d = det3(matrix)
              const color = Math.abs(d) < 0.01 ? '#EF9F27'
                : d < 0 ? '#e06c75'
                : '#5DCAA5'
              return (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10 }}>
                  <span style={{ color: '#444' }}>det</span>
                  <span style={{ color, fontFamily: 'monospace', fontWeight: 700 }}>
                    {Math.abs(d) < 1e-10 ? '0' : d.toFixed(3)}
                  </span>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out"
        style={{ background: obj.color, border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
