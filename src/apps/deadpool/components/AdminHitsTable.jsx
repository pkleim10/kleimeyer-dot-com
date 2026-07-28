'use client'

import { useEffect, useState } from 'react'
import { formatDeathDate } from './ui.jsx'

export default function AdminHitsTable({ hits: initialHits, accessToken }) {
  const [hits, setHits] = useState(initialHits)
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({})
  const [error, setError] = useState(null)

  // useState's initial value is only used on first mount — this re-syncs
  // whenever the parent's fetch resolves with fresh data (or a later
  // refresh), since otherwise an empty first render permanently locks in
  // an empty list regardless of what arrives afterward.
  useEffect(() => {
    setHits(initialHits)
  }, [initialHits])

  function startEdit(hit) {
    setEditingId(hit.id)
    setDraft({
      displayName: hit.display_name,
      dateOfDeath: hit.date_of_death,
      ageAtDeath: hit.age_at_death,
      announcementText: hit.announcement_text || '',
    })
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  async function saveEdit(id) {
    setError(null)
    try {
      const res = await fetch(`/api/deadpool/admin/hits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update')
        return
      }
      setHits((prev) => prev.map((h) => (h.id === id ? { ...h, ...data.hit } : h)))
      setEditingId(null)
    } catch {
      setError('Failed to update')
    }
  }

  async function deleteHit(id) {
    if (!window.confirm('Delete this recorded death?')) return
    try {
      const res = await fetch(`/api/deadpool/admin/hits/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return
      setHits((prev) => prev.filter((h) => h.id !== id))
    } catch {
      // no-op
    }
  }

  if (hits.length === 0) {
    return <p className="text-gray-400">No deaths recorded yet.</p>
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-gray-400">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Age</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {hits.map((hit) =>
            editingId === hit.id ? (
              <tr key={hit.id} className="border-b border-zinc-900">
                <td className="py-2 pr-4">
                  <input
                    value={draft.displayName}
                    onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1 w-full"
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="date"
                    value={draft.dateOfDeath}
                    onChange={(e) => setDraft((d) => ({ ...d, dateOfDeath: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1"
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    value={draft.ageAtDeath}
                    onChange={(e) => setDraft((d) => ({ ...d, ageAtDeath: e.target.value }))}
                    className="bg-zinc-900 border border-zinc-700 text-white rounded px-2 py-1 w-16"
                  />
                </td>
                <td className="py-2 space-x-2">
                  <button onClick={() => saveEdit(hit.id)} className="text-green-400 hover:text-green-300">
                    Save
                  </button>
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-white">
                    Cancel
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={hit.id} className="border-b border-zinc-900">
                <td className="py-2 pr-4 text-white">{hit.display_name}</td>
                <td className="py-2 pr-4 text-gray-400">{formatDeathDate(hit.date_of_death)}</td>
                <td className="py-2 pr-4 text-gray-400">{hit.age_at_death}</td>
                <td className="py-2 space-x-2">
                  <button onClick={() => startEdit(hit)} className="text-gray-300 hover:text-white">
                    Edit
                  </button>
                  <button onClick={() => deleteHit(hit.id)} className="text-red-400 hover:text-red-300">
                    Delete
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  )
}
