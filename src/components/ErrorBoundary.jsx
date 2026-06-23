import { Component } from 'react'
import { sendCrashReport } from '../utils/crashReporter'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    sendCrashReport({
      message: error.message,
      stack: (error.stack ?? '') + '\n\nComponent Stack:\n' + info.componentStack,
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: '#1a1a2e', color: '#e0e0e0', fontFamily: 'sans-serif', gap: 20,
      }}>
        <div style={{ fontSize: 40 }}>💥</div>

        <div style={{ fontSize: 20, fontWeight: 700, color: '#e06c75' }}>
          LinLab has crashed
        </div>

        <div style={{ fontSize: 13, color: '#666', maxWidth: 420, textAlign: 'center', lineHeight: 1.6 }}>
          A crash report has been sent automatically to your instructor.
          You can reload the page to start a new session.
        </div>

        <pre style={{
          background: '#0d1b2e', color: '#9a9fc0',
          padding: '12px 18px', borderRadius: 8,
          fontSize: 11, maxWidth: 580, width: '90%',
          overflowX: 'auto', whiteSpace: 'pre-wrap',
          border: '1px solid #2a2a4a',
        }}>
          {this.state.error?.message}
        </pre>

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 24px', borderRadius: 6,
            border: '1px solid #5DCAA5', background: 'transparent',
            color: '#5DCAA5', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#5DCAA522'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Reload
        </button>
      </div>
    )
  }
}
