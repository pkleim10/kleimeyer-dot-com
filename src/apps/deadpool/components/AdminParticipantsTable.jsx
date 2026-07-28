'use client'

import { useEffect, useState } from 'react'

export default function AdminParticipantsTable({ participants: initialParticipants, accessToken, seasonYear }) {
  const [participants, setParticipants] = useState(initialParticipants)
  const [error, setError] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  // useState's initial value is only used on first mount — this re-syncs
  // whenever the parent's fetch resolves with fresh data (or a later
  // refresh), since otherwise an empty first render permanently locks in
  // an empty list regardless of what arrives afterward.
  useEffect(() => {
    setParticipants(initialParticipants)
  }, [initialParticipants])

  async function removeParticipant(participant) {
    if (
      !window.confirm(
        `Remove ${participant.display_name} (${participant.email})? This deletes their picks and logs them out. This can't be undone.`
      )
    ) {
      return
    }

    setError(null)
    setRemovingId(participant.id)
    try {
      const res = await fetch(`/api/deadpool/admin/participants/${participant.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Failed to remove participant')
        return
      }
      setParticipants((prev) => prev.filter((p) => p.id !== participant.id))
    } catch {
      setError('Failed to remove participant')
    } finally {
      setRemovingId(null)
    }
  }

  if (participants.length === 0) {
    return <p className="text-gray-400">No one has registered yet.</p>
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-gray-400">
            <th className="py-2 pr-4">Team name</th>
            <th className="py-2 pr-4">Email</th>
            <th className="py-2 pr-4">Registered</th>
            <th className="py-2 pr-4">In {seasonYear ?? 'active season'}</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id} className="border-b border-zinc-900">
              <td className="py-2 pr-4 text-white">{participant.display_name}</td>
              <td className="py-2 pr-4 text-gray-400">{participant.email}</td>
              <td className="py-2 pr-4 text-gray-400">
                {new Date(participant.created_at).toLocaleDateString()}
              </td>
              <td className="py-2 pr-4">
                {participant.inActiveSeason ? (
                  <span className="text-green-400">Yes</span>
                ) : (
                  <span className="text-gray-500">No list yet</span>
                )}
              </td>
              <td className="py-2">
                <button
                  onClick={() => removeParticipant(participant)}
                  disabled={removingId === participant.id}
                  className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {removingId === participant.id ? 'Removing…' : 'Remove'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
