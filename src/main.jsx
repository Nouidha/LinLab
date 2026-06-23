import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { sendCrashReport } from './utils/crashReporter.js'

// Catch unhandled JS errors (outside React's render tree)
window.onerror = (_msg, _src, _line, _col, error) => {
  sendCrashReport({
    message: error?.message ?? String(_msg),
    stack: error?.stack ?? `${_src}:${_line}:${_col}`,
  })
}

// Catch unhandled promise rejections
window.onunhandledrejection = (event) => {
  sendCrashReport({
    message: event.reason?.message ?? String(event.reason),
    stack: event.reason?.stack ?? 'Unhandled promise rejection — no stack available',
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
