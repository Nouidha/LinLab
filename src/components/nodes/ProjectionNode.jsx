import { Handle, Position } from 'reactflow'
import { useSceneStore } from '../../store/useSceneStore'
import NodeDeleteBtn from './NodeDeleteBtn'
import { planeMatrix, multiply } from '../../utils/matrices'

const COLOR  = '#f4c542'
const IDENT  = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]

function fmt(v) { return (Math.abs(v) < 1e-4 ? 0 : v).toFixed(3) }

function computeProjection(isLine, pointObj, ontoObj, matrices) {
  if (!pointObj || !ontoObj) return null

  const pm = matrices[pointObj.id] ?? IDENT
  const x = pointObj.x ?? 0, y = pointObj.y ?? 0, z = pointObj.z ?? 0
  const P = [
    pm[0]*x + pm[4]*y + pm[8]*z + pm[12],
    pm[1]*x + pm[5]*y + pm[9]*z + pm[13],
    pm[2]*x + pm[6]*y + pm[10]*z + pm[14],
  ]

  if (isLine) {
    const lm   = matrices[ontoObj.id] ?? IDENT
    const P0   = [lm[12], lm[13], lm[14]]
    const dRaw = [lm[8],  lm[9],  lm[10]]
    const dLen = Math.sqrt(dRaw[0]**2 + dRaw[1]**2 + dRaw[2]**2)
    if (dLen < 1e-10) return null
    const d = dRaw.map(v => v / dLen)
    const v = [P[0]-P0[0], P[1]-P0[1], P[2]-P0[2]]
    const t = v[0]*d[0] + v[1]*d[1] + v[2]*d[2]
    const proj = [P0[0]+t*d[0], P0[1]+t*d[1], P0[2]+t*d[2]]
    const diff = [P[0]-proj[0], P[1]-proj[1], P[2]-proj[2]]
    return { P, proj, dist: Math.sqrt(diff[0]**2 + diff[1]**2 + diff[2]**2) }
  } else {
    const chainMat = matrices[ontoObj.id] ?? IDENT
    const baseMat  = planeMatrix(ontoObj.normal ?? [0,1,0], ontoObj.distance ?? 0)
    const worldMat = multiply(chainMat, baseMat)
    const nRaw = [worldMat[8], worldMat[9], worldMat[10]]
    const nLen = Math.sqrt(nRaw[0]**2 + nRaw[1]**2 + nRaw[2]**2)
    if (nLen < 1e-10) return null
    const n      = nRaw.map(v => v / nLen)
    const anchor = [worldMat[12], worldMat[13], worldMat[14]]
    const dPlane = anchor[0]*n[0] + anchor[1]*n[1] + anchor[2]*n[2]
    const sd     = P[0]*n[0] + P[1]*n[1] + P[2]*n[2] - dPlane
    const proj   = [P[0]-sd*n[0], P[1]-sd*n[1], P[2]-sd*n[2]]
    return { P, proj, dist: Math.abs(sd) }
  }
}

export default function ProjectionNode({ id, type, data }) {
  const edges    = useSceneStore(s => s.edges)
  const objects  = useSceneStore(s => s.objects)
  const nodes    = useSceneStore(s => s.nodes)
  const matrices = useSceneStore(s => s.matrices)

  const isLine = type === 'pointOnLineNode'
  const title  = isLine ? 'Proj → Line' : 'Proj → Plane'

  const ePoint = edges.find(e => e.target === id && e.targetHandle === 'proj-point-in')
  const eOnto  = edges.find(e => e.target === id && e.targetHandle === 'proj-onto-in')
  const srcPoint = ePoint ? nodes.find(n => n.id === ePoint.source) : null
  const srcOnto  = eOnto  ? nodes.find(n => n.id === eOnto.source) : null
  const pointObj = srcPoint?.data?.objectId ? objects.find(o => o.id === srcPoint.data.objectId) : null
  const ontoObj  = srcOnto?.data?.objectId  ? objects.find(o => o.id === srcOnto.data.objectId) : null

  const result = computeProjection(isLine, pointObj, ontoObj, matrices)

  const row = { position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }
  const lH  = { background: '#888', border: 'none', width: 7, height: 7, left: -18 }
  const rH  = { background: '#888', border: 'none', width: 7, height: 7, right: -18 }

  return (
    <div style={{
      background: '#16213e',
      border: `1px solid ${COLOR}`,
      borderLeft: `4px solid ${COLOR}`,
      borderRadius: 8, minWidth: 230,
      fontFamily: 'sans-serif', fontSize: 12, color: '#e0e0e0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    }}>
      <div style={{
        background: COLOR+'22', borderBottom: `1px solid ${COLOR}44`,
        padding: '5px 8px 5px 10px', fontWeight: 700, fontSize: 13,
        display: 'flex', alignItems: 'center',
      }}>
        <span style={{ flex: 1 }}>{title}</span>
        <NodeDeleteBtn nodeId={id} />
      </div>

      <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>

        {/* Point input */}
        <div style={row}>
          <Handle type="target" position={Position.Left} id="proj-point-in" style={lH} />
          <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>Point</span>
          <span style={{ color: pointObj?.color ?? '#444', fontSize: 10, fontFamily: 'monospace', flex: 1 }}>
            {srcPoint?.data?.label ?? '—'}
          </span>
        </div>

        {/* Line / Plane input */}
        <div style={row}>
          <Handle type="target" position={Position.Left} id="proj-onto-in" style={lH} />
          <span style={{ color: '#888', fontSize: 11, minWidth: 40 }}>{isLine ? 'Line' : 'Plane'}</span>
          <span style={{ color: ontoObj?.color ?? '#444', fontSize: 10, fontFamily: 'monospace', flex: 1 }}>
            {srcOnto?.data?.label ?? '—'}
          </span>
        </div>

        <div style={{ height: 1, background: COLOR+'33' }} />

        {result ? (
          <>
            {/* Projected point */}
            <div style={{
              background: '#0a1020', border: `1px solid ${COLOR}33`,
              borderRadius: 5, padding: '6px 8px',
              fontFamily: 'monospace', fontSize: 11, color: COLOR,
            }}>
              proj = ({fmt(result.proj[0])}, {fmt(result.proj[1])}, {fmt(result.proj[2])})
            </div>

            {/* Distance output */}
            <div style={row}>
              <Handle type="source" position={Position.Right} id="dist-out" style={rH} />
              <span style={{ color: '#888', fontSize: 11, flex: 1 }}>
                d(P, {isLine ? 'L' : 'Π'})
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#e0e0e0' }}>
                {fmt(result.dist)}
              </span>
            </div>
          </>
        ) : (
          <div style={{ color: '#444', fontSize: 11, textAlign: 'center' }}>
            connect a Point and a {isLine ? 'Line' : 'Plane'}
          </div>
        )}
      </div>

      {/* point-out: drives a Point object's position */}
      <Handle type="source" position={Position.Right} id="point-out"
        style={{ background: COLOR, border: 'none', width: 10, height: 10 }} />
    </div>
  )
}
