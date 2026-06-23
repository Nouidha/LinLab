import { useCallback, useRef, useState } from 'react'
import Scene from './components/Scene'
import NodeCanvas from './components/NodeCanvas'
import Toolbar from './components/Toolbar'
import LeftPanel from './components/LeftPanel'
import { useSceneStore } from './store/useSceneStore'

import rotatingCube    from './scenes/rotating_cube.json'
import eigenvalueDemo  from './scenes/eigenvalue_demo.json'
import vectorOpsDemo   from './scenes/vector_ops_demo.json'

const EXAMPLES = {
  rotating_cube:    rotatingCube,
  eigenvalue_demo:  eigenvalueDemo,
  vector_ops_demo:  vectorOpsDemo,
}

const EXAMPLE_LABELS = {
  rotating_cube:   'Rotating Cube',
  eigenvalue_demo: 'Scaling Demo',
  vector_ops_demo: 'Vector Ops',
}

export default function App() {
  const loadScene  = useSceneStore(s => s.loadScene)
  const createTab  = useSceneStore(s => s.createTab)
  const [topPct, setTopPct] = useState(60)
  const containerRef = useRef()

  const handleLoadExample = useCallback((key) => {
    if (EXAMPLES[key]) createTab(EXAMPLE_LABELS[key] ?? key, EXAMPLES[key])
  }, [createTab])

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    const onMove = (ev) => {
      const rect = container.getBoundingClientRect()
      const pct = ((ev.clientY - rect.top) / rect.height) * 100
      setTopPct(Math.max(15, Math.min(85, pct)))
    }

    const onUp = () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div ref={containerRef} style={{
      display: 'flex', flexDirection: 'column',
      width: '100vw', height: '100vh',
      background: '#1a1a2e', overflow: 'hidden',
    }}>
      {/* Three.js scene — resizable */}
      <div style={{ height: `${topPct}%`, minHeight: 0 }}>
        <Scene />
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onDividerMouseDown}
        style={{
          height: 5, flexShrink: 0,
          background: '#1e2a4a',
          cursor: 'row-resize',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#2e4a8a'}
        onMouseLeave={e => e.currentTarget.style.background = '#1e2a4a'}
      >
        <div style={{ width: 32, height: 2, borderRadius: 1, background: '#3a5a9a', pointerEvents: 'none' }} />
      </div>

      {/* Toolbar — clock, examples, save/load */}
      <Toolbar onLoadExample={handleLoadExample} />

      {/* Node canvas — takes remaining space */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LeftPanel />
        <div style={{ flex: 1, minWidth: 0 }}>
          <NodeCanvas />
        </div>
      </div>
    </div>
  )
}
