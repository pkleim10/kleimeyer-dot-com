'use client'

import { useState } from 'react'
import { Panel, SectionTitle, inputClass, labelClass, primaryButtonClass } from './ui.jsx'

const STATUS_STYLES = {
  pending: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  approved: 'border-green-500/40 bg-green-500/10 text-green-300',
  rejected: 'border-zinc-600/40 bg-zinc-600/10 text-zinc-400',
}

export default function SubmissionForm({ initialSubmissions }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/deadpool/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, note }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to submit' })
        return
      }

      setSubmissions((prev) => [data.submission, ...prev])
      setName('')
      setNote('')
      setStatus({ type: 'success', message: 'Tip submitted — thanks!' })
    } catch {
      setStatus({ type: 'error', message: 'Failed to submit' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Panel className="space-y-4 p-5">
          <div>
            <label htmlFor="name" className={labelClass}>
              Who died?
            </label>
            <input
              id="name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="note" className={labelClass}>
              Source / notes (optional)
            </label>
            <textarea
              id="note"
              maxLength={500}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A link or where you heard it helps the commissioner verify."
              className={inputClass}
            />
          </div>

          {status && (
            <p className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {status.message}
            </p>
          )}
        </Panel>

        <button type="submit" disabled={submitting} className={primaryButtonClass}>
          {submitting ? 'Submitting…' : 'Submit Tip'}
        </button>
      </form>

      {submissions.length > 0 && (
        <div>
          <SectionTitle className="mb-3">Your tips</SectionTitle>
          <Panel className="divide-y divide-zinc-900">
            {submissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-gray-200">{s.name}</span>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${
                    STATUS_STYLES[s.status] || STATUS_STYLES.rejected
                  }`}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </Panel>
        </div>
      )}
    </div>
  )
}
