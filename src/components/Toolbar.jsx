import { useRef, useState } from 'react'
import { useSceneStore } from '../store/useSceneStore'

const BTN = (extra = {}) => ({
  padding: '3px 11px',
  borderRadius: 5,
  border: '1px solid #333',
  background: '#0d1b2e',
  color: '#ccc',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: '1.6',
  ...extra,
})

function AboutModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#12192e',
          border: '1px solid #2a2a4a',
          borderRadius: 12,
          padding: '32px 36px',
          maxWidth: 460,
          width: '90%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          fontFamily: 'sans-serif',
          color: '#e0e0e0',
          position: 'relative',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 14, right: 16,
            background: 'transparent', border: 'none',
            color: '#444', cursor: 'pointer', fontSize: 20, lineHeight: 1,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#e06c75'}
          onMouseLeave={e => e.currentTarget.style.color = '#444'}
        >×</button>

        {/* Title */}
        <div style={{ fontSize: 22, fontWeight: 700, color: '#7F77DD', marginBottom: 4 }}>
          LinLab
        </div>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 20, letterSpacing: '0.05em' }}>
          Interactive visualiser — Linear Algebra &amp; Vector Geometry
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, lineHeight: 1.7, color: '#9a9fc0', margin: '0 0 20px' }}>
          LinLab is a pedagogical tool designed to support courses in linear algebra and vector
          geometry. It lets students visually explore linear transformations, vector operations,
          and the effect of 4×4 matrices on 3D objects through an intuitive node-based system
          and real-time animation.
        </p>

        <div style={{ height: 1, background: '#1e2a4a', margin: '0 0 20px' }} />

        {/* Author */}
        <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Créé par</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
          Mohamed Nouidha
        </div>
        <a
          href="mailto:nouidham@sainteanne.ca"
          style={{ fontSize: 12, color: '#7F77DD', textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
          onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
        >
          nouidham@sainteanne.ca
        </a>

        <div style={{ marginTop: 20, fontSize: 11, color: '#333', textAlign: 'right' }}>
          Collège Sainte-Anne
        </div>
      </div>
    </div>
  )
}

export default function Toolbar({ onLoadExample }) {
  const clock          = useSceneStore(s => s.clock)
  const toggleClock    = useSceneStore(s => s.toggleClock)
  const resetClock     = useSceneStore(s => s.resetClock)
  const setClockSpeed  = useSceneStore(s => s.setClockSpeed)
  const showAxes       = useSceneStore(s => s.showAxes)
  const toggleAxes     = useSceneStore(s => s.toggleAxes)
  const createTab        = useSceneStore(s => s.createTab)
  const setTabFileHandle = useSceneStore(s => s.setTabFileHandle)
  const renameTab        = useSceneStore(s => s.renameTab)
  const tabs             = useSceneStore(s => s.tabs)
  const activeTabId      = useSceneStore(s => s.activeTabId)
  const fileRef          = useRef()
  const [aboutOpen, setAboutOpen] = useState(false)

  const activeTab = tabs.find(t => t.id === activeTabId)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function buildJson() {
    const { objects, nodes, edges } = useSceneStore.getState()
    return JSON.stringify({ objects, nodes, edges, clock: { ...clock, running: false } }, null, 2)
  }

  async function writeToHandle(handle, json) {
    const writable = await handle.createWritable()
    await writable.write(json)
    await writable.close()
  }

  function downloadFallback(json, suggestedName) {
    const name = window.prompt('File name:', suggestedName)
    if (name === null) return
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.replace(/\.json$/i, '')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Save — write to linked file, or prompt if none ───────────────────────

  const handleSave = async () => {
    const json = buildJson()

    if (window.showSaveFilePicker) {
      try {
        let handle = activeTab?.fileHandle ?? null
        if (!handle) {
          handle = await window.showSaveFilePicker({
            suggestedName: `${activeTab?.label ?? 'linlab-scene'}.json`,
            types: [{ description: 'LinLab Scene', accept: { 'application/json': ['.json'] } }],
          })
          setTabFileHandle(activeTabId, handle)
        }
        await writeToHandle(handle, json)
        renameTab(activeTabId, handle.name.replace(/\.json$/i, ''))
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      downloadFallback(json, activeTab?.label ?? 'linlab-scene')
    }
  }

  // ── Save As — always prompt ───────────────────────────────────────────────

  const handleSaveAs = async () => {
    const json = buildJson()

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `${activeTab?.label ?? 'linlab-scene'}.json`,
          types: [{ description: 'LinLab Scene', accept: { 'application/json': ['.json'] } }],
        })
        await writeToHandle(handle, json)
        setTabFileHandle(activeTabId, handle)
        renameTab(activeTabId, handle.name.replace(/\.json$/i, ''))
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e)
      }
    } else {
      downloadFallback(json, activeTab?.label ?? 'linlab-scene')
    }
  }

  // ── Load — use file picker where available, fall back to <input> ─────────

  const handleLoad = async () => {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'LinLab Scene', accept: { 'application/json': ['.json'] } }],
        })
        const file  = await handle.getFile()
        const scene = JSON.parse(await file.text())
        const label = handle.name.replace(/\.json$/i, '')
        createTab(label, scene)
        setTabFileHandle(useSceneStore.getState().activeTabId, handle)
      } catch (e) {
        if (e.name !== 'AbortError') alert('Invalid scene file')
      }
    } else {
      fileRef.current?.click()
    }
  }

  // Safari fallback file-input handler
  const handleFileInput = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const label = file.name.replace(/\.json$/i, '')
    const reader = new FileReader()
    reader.onload = (ev) => {
      try { createTab(label, JSON.parse(ev.target.result)) }
      catch { alert('Invalid scene file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      <div style={{
        height: 38,
        background: '#12192e',
        borderBottom: '1px solid #2a2a4a',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        userSelect: 'none',
        flexShrink: 0,
      }}>
        {/* Clock */}
        <button
          onClick={toggleClock}
          style={BTN({ color: clock.running ? '#5DCAA5' : '#ccc', borderColor: clock.running ? '#5DCAA5' : '#333' })}
        >
          {clock.running ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={resetClock} style={BTN()}>⏹ Reset</button>
        <span style={{ color: '#555', fontSize: 11, minWidth: 72 }}>t = {clock.globalTime.toFixed(2)} s</span>

        <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

        <span style={{ color: '#666', fontSize: 11 }}>Speed</span>
        <input
          type="range" min={0.1} max={5} step={0.1}
          value={clock.speed}
          onChange={e => setClockSpeed(parseFloat(e.target.value))}
          style={{ width: 80, accentColor: '#7F77DD' }}
        />
        <span style={{ color: '#aaa', fontSize: 11, minWidth: 26 }}>×{clock.speed.toFixed(1)}</span>

        <div style={{ flex: 1 }} />

        {/* Axes toggle */}
        <button
          onClick={toggleAxes}
          title="Afficher / masquer les axes XYZ"
          style={BTN({ color: showAxes ? '#5DCAA5' : '#555', borderColor: showAxes ? '#5DCAA5' : '#333' })}
        >
          {showAxes ? 'Axes ✕' : 'Axes'}
        </button>

        <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

        {/* Examples */}
        <span style={{ color: '#555', fontSize: 11 }}>Examples</span>
        <select
          onChange={e => {
            if (!e.target.value) return
            onLoadExample?.(e.target.value)
            e.target.value = ''
          }}
          style={{ background: '#0d1b2e', color: '#888', border: '1px solid #333', borderRadius: 5, fontSize: 11, padding: '2px 4px', cursor: 'pointer' }}
        >
          <option value="">— load —</option>
          <option value="rotating_cube">Rotating Cube</option>
          <option value="eigenvalue_demo">Scaling Demo</option>
          <option value="vector_ops_demo">Vector Ops</option>
        </select>


        <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

        {/* Save / Save As / Load */}
        <button
          onClick={handleSave}
          title={activeTab?.fileHandle ? `Save to "${activeTab.fileHandle.name}"` : 'Save (choose location)'}
          style={BTN({ color: '#5DCAA5', borderColor: '#5DCAA5' })}
        >
          💾 Save
        </button>
        <button
          onClick={handleSaveAs}
          title="Save a copy to a new location"
          style={BTN({ color: '#5DCAA5', borderColor: '#5DCAA555' })}
        >
          Save As
        </button>
        <button style={BTN({ color: '#EF9F27', borderColor: '#EF9F27' })} onClick={handleLoad}>
          📂 Load
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileInput} />

        <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />

        {/* About */}
        <button
          onClick={() => setAboutOpen(true)}
          title="À propos"
          style={BTN({ color: '#555', borderColor: '#2a2a4a', padding: '3px 8px', fontWeight: 700 })}
          onMouseEnter={e => e.currentTarget.style.color = '#9a9fc0'}
          onMouseLeave={e => e.currentTarget.style.color = '#555'}
        >?</button>
      </div>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  )
}
