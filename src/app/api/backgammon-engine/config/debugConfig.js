/**
 * Debug logging configuration for backgammon engine
 */

// Debug logging helper that only logs when debug is enabled
export function debugFetchLog(location, message, data = {}) {
  if (process.env.NEXT_PUBLIC_DEBUG_LOGGING !== 'true') return

  fetch('http://127.0.0.1:7242/ingest/77a958ec-7306-4149-95fb-3e227fab679e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run8',
      hypothesisId: 'H'
    })
  }).catch(() => {})
}