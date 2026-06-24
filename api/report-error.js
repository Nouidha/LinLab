export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, stack, userAgent, timestamp, scene } = req.body

  const date = new Date(timestamp).toLocaleString('fr-CA', {
    timeZone: 'America/Toronto',
    dateStyle: 'full',
    timeStyle: 'medium',
  })

  const objectCount = scene?.objects?.length ?? 0
  const nodeCount   = scene?.nodes?.length   ?? 0
  const edgeCount   = scene?.edges?.length   ?? 0
  const sceneJson   = JSON.stringify(scene, null, 2)

  const html = `
<div style="font-family:monospace;max-width:800px;margin:0 auto;background:#0d1020;color:#e0e0e0;padding:24px;border-radius:12px;">
  <h2 style="color:#e06c75;margin-top:0;">💥 LinLab — Crash Report</h2>
  <table style="border-collapse:collapse;margin-bottom:20px;">
    <tr><td style="color:#666;padding:3px 16px 3px 0;">Date</td><td>${date}</td></tr>
    <tr><td style="color:#666;padding:3px 16px 3px 0;">Browser</td><td style="font-size:12px;">${escape(userAgent)}</td></tr>
    <tr><td style="color:#666;padding:3px 16px 3px 0;">Scene</td><td>${objectCount} objects · ${nodeCount} nodes · ${edgeCount} edges</td></tr>
  </table>

  <h3 style="color:#ef9f27;">Error message</h3>
  <pre style="background:#1a1a2e;color:#e06c75;padding:14px;border-radius:8px;white-space:pre-wrap;font-size:13px;">${escape(message)}</pre>

  <h3 style="color:#ef9f27;">Call stack</h3>
  <pre style="background:#1a1a2e;color:#9a9fc0;padding:14px;border-radius:8px;white-space:pre-wrap;font-size:11px;overflow-x:auto;">${escape(stack)}</pre>

  <h3 style="color:#ef9f27;">Scene (JSON)</h3>
  <pre style="background:#1a1a2e;color:#7F77DD;padding:14px;border-radius:8px;white-space:pre-wrap;font-size:10px;overflow-x:auto;max-height:500px;">${escape(sceneJson)}</pre>
</div>`

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LinLab <onboarding@resend.dev>',
        to: ['linlb.app@gmail.com'],
        subject: `[LinLab] Crash — ${message.slice(0, 72)}`,
        html,
      }),
    })

    if (!r.ok) {
      const body = await r.text()
      console.error('Resend error:', body)
      return res.status(502).json({ error: 'Email service error' })
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('report-error handler:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}

function escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
