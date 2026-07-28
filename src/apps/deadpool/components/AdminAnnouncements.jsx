'use client'

import { useEffect, useState } from 'react'
import { Panel, inputClass, labelClass, primaryButtonClass } from './ui.jsx'

// Post and manage general (non-death) notices. Recorded deaths are handled
// separately by AdminHitForm — those generate their own feed entries.
export default function AdminAnnouncements({ announcements: initial, accessToken, onChanged }) {
  const [announcements, setAnnouncements] = useState(initial || [])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    setAnnouncements(initial || [])
  }, [initial])

  async function handlePost(e) {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/deadpool/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title, body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to post' })
        return
      }
      setAnnouncements((prev) => [data.announcement, ...prev])
      setTitle('')
      setBody('')
      setStatus({ type: 'success', message: 'Posted.' })
      onChanged?.()
    } catch {
      setStatus({ type: 'error', message: 'Failed to post' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(announcement) {
    if (!window.confirm('Delete this announcement?')) return
    setDeletingId(announcement.id)
    try {
      const res = await fetch(`/api/deadpool/admin/announcements/${announcement.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setStatus({ type: 'error', message: data.error || 'Failed to delete' })
        return
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id))
      onChanged?.()
    } catch {
      setStatus({ type: 'error', message: 'Failed to delete' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handlePost} className="space-y-4">
        <Panel className="space-y-4 p-5">
          <div>
            <label htmlFor="announcementTitle" className={labelClass}>
              Title (optional)
            </label>
            <input
              id="announcementTitle"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Picks close Friday"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="announcementBody" className={labelClass}>
              Announcement
            </label>
            <textarea
              id="announcementBody"
              required
              maxLength={2000}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Anything that isn't a death — deadlines, prize pot updates, trash talk."
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
          {submitting ? 'Posting…' : 'Post Announcement'}
        </button>
      </form>

      {announcements.length > 0 && (
        <Panel className="divide-y divide-zinc-900">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                {a.title && <p className="font-display text-sm text-white">{a.title}</p>}
                <p className="mt-0.5 line-clamp-2 text-sm text-gray-400">{a.body}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                  {new Date(a.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(a)}
                disabled={deletingId === a.id}
                className="shrink-0 text-sm text-red-400 transition hover:text-red-300 disabled:opacity-50"
              >
                {deletingId === a.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          ))}
        </Panel>
      )}
    </div>
  )
}
