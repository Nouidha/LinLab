import { TRANSFORM_CONFIGS } from './nodes/TransformNode'

// ── Data ──────────────────────────────────────────────────────────────────────

const PRIMITIVES = [
  { type: 'cube',   label: 'Cube',   icon: '■', color: '#7F77DD' },
  { type: 'sphere', label: 'Sphere', icon: '●', color: '#5DCAA5' },
  { type: 'torus',  label: 'Torus',  icon: '⊙', color: '#EF9F27' },
  { type: 'plane',  label: 'Plane',  icon: '▭', color: '#F0997B' },
  { type: 'cone',     label: 'Cone',     icon: '▲', color: '#6ec3f4' },
  { type: 'cylinder', label: 'Cylinder', icon: '⬡', color: '#a78bfa' },
  { type: 'line',     label: 'Line',     icon: '↔', color: '#f4c542' },
  { type: 'point',   label: 'Point',   icon: '•', color: '#e06c75' },
  { type: 'vector',  label: 'Vector',  icon: '→', color: '#61afef' },
  { type: 'segment', label: 'Segment', icon: '—', color: '#a0c4ff' },
]

const MATH_NODES = [
  { type: 'timeNode',       label: 'Time',       icon: '⏱', defaultData: {} },
  { type: 'waveformNode',   label: 'Waveform',   icon: '∿', defaultData: { params: { type: 'sin', amplitude: 90, frequency: 0.5, phase: 0 } } },
  { type: 'scalarNode',     label: 'Scalar',     icon: '#', defaultData: { params: { value: 0 } } },
  { type: 'expressionNode', label: 'Expression', icon: 'ƒ', defaultData: { params: { expression: 't * 90' } } },
  { type: 'vectorOpNode',  label: 'Vector Op',  icon: '⊕', defaultData: { params: { operation: 'add', showResult: true, color: '#a78bfa' } } },
]

const GEOMETRY_NODES = [
  { type: 'pointOnLineNode',  label: 'Proj → Line',  icon: '⊥', defaultData: { params: { showResult: true, showDistance: false, resultColor: '#f4c542' } } },
  { type: 'pointOnPlaneNode', label: 'Proj → Plane', icon: '⊥', defaultData: { params: { showResult: true, showDistance: false, resultColor: '#f4c542' } } },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
      color: '#3a4060', padding: '10px 10px 4px',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#1a2240', margin: '4px 0' }} />
}

function DragItem({ label, icon, accentColor, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '5px 10px',
        borderLeft: `3px solid ${accentColor}`,
        background: 'transparent',
        color: '#9a9fc0',
        cursor: 'grab',
        fontSize: 11,
        userSelect: 'none',
        transition: 'background 0.12s',
        borderRadius: '0 4px 4px 0',
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#1a2444'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {icon && (
        <span style={{ color: accentColor, fontSize: 13, lineHeight: 1, flexShrink: 0 }}>
          {icon}
        </span>
      )}
      {label}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

function setDrag(e, payload) {
  e.dataTransfer.setData('application/linlab', JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'move'
}

export default function LeftPanel() {
  return (
    <div style={{
      width: 158,
      flexShrink: 0,
      background: '#0e1628',
      borderRight: '1px solid #1e2a4a',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Primitives ── */}
      <SectionLabel>Primitives</SectionLabel>
      {PRIMITIVES.map(p => (
        <DragItem
          key={p.type}
          label={p.label}
          icon={p.icon}
          accentColor={p.color}
          onDragStart={e => setDrag(e, { category: 'object', objectType: p.type })}
        />
      ))}

      <Divider />

      {/* ── Transforms ── */}
      <SectionLabel>Transforms</SectionLabel>
      {Object.entries(TRANSFORM_CONFIGS).map(([type, cfg]) => (
        <DragItem
          key={type}
          label={cfg.label}
          accentColor={cfg.color}
          onDragStart={e => setDrag(e, { category: 'transform', transformType: type })}
        />
      ))}

      <Divider />

      {/* ── Math nodes ── */}
      <SectionLabel>Math</SectionLabel>
      {MATH_NODES.map(m => (
        <DragItem
          key={m.type}
          label={m.label}
          icon={m.icon}
          accentColor="#3a4060"
          onDragStart={e => setDrag(e, { category: 'math', nodeType: m.type, defaultData: m.defaultData })}
        />
      ))}

      <Divider />

      {/* ── Geometry nodes ── */}
      <SectionLabel>Geometry</SectionLabel>
      {GEOMETRY_NODES.map(m => (
        <DragItem
          key={m.type}
          label={m.label}
          icon={m.icon}
          accentColor="#f4c542"
          onDragStart={e => setDrag(e, { category: 'math', nodeType: m.type, defaultData: m.defaultData })}
        />
      ))}

      {/* bottom padding */}
      <div style={{ flexGrow: 1 }} />
    </div>
  )
}
