import { useSceneStore } from '../store/useSceneStore'

// Deduplicate within a session: same error won't trigger multiple emails
const _reported = new Set()

export async function sendCrashReport({ message, stack }) {
  const key = message + (stack?.split('\n')[1] ?? '')
  if (_reported.has(key)) return
  _reported.add(key)

  try {
    const { objects, nodes, edges } = useSceneStore.getState()
    await fetch('/api/report-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        stack: stack ?? 'No stack available',
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        scene: { objects, nodes, edges },
      }),
    })
  } catch {
    // Silently ignore — we're already in an error state
  }
}
