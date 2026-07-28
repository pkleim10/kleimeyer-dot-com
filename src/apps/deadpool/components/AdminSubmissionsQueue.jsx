'use client'

import { useEffect, useState } from 'react'

export default function AdminSubmissionsQueue({ submissions: initialSubmissions, accessToken, onRecordFromSubmission }) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [error, setError] = useState(null)

  // useState's initial value is only used on first mount — this re-syncs
  // whenever the parent's fetch resolves with fresh data (or a later
  // refresh), since otherwise an empty first render permanently locks in
  // an empty list regardless of what arrives afterward.
  useEffect(() => {
    setSubmissions(initialSubmissions)
  }, [initialSubmissions])

  async function dismiss(id) {
    setError(null)
    try {
      const res = await fetch(`/api/deadpool/admin/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ status: 'rejected' }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to dismiss')
        return
      }
      setSubmissions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Failed to dismiss')
    }
  }

  if (submissions.length === 0) {
    return <p className="text-gray-400">No pending tips.</p>
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {submissions.map((submission) => (
        <div
          key={submission.id}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex items-start justify-between gap-4"
        >
          <div>
            <p className="text-white font-semibold">{submission.name}</p>
            {submission.note && <p className="text-gray-400 text-sm mt-1">{submission.note}</p>}
            <p className="text-xs text-gray-500 mt-1">
              {submission.submittedBy ? `From ${submission.submittedBy}` : 'Anonymous'} ·{' '}
              {new Date(submission.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onRecordFromSubmission(submission)}
              className="text-sm bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded"
            >
              Record death
            </button>
            <button type="button" onClick={() => dismiss(submission.id)} className="text-sm text-gray-400 hover:text-white">
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
