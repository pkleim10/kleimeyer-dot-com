'use client'

import { useState, useEffect } from 'react'

const inputClass =
  'bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-red-600'

export default function AdminHitForm({ accessToken, prefill, onRecorded, onCancelPrefill }) {
  const [pickNames, setPickNames] = useState([])
  const [displayName, setDisplayName] = useState('')
  const [dateOfDeath, setDateOfDeath] = useState(() => new Date().toISOString().slice(0, 10))
  const [ageAtDeath, setAgeAtDeath] = useState('')
  const [announcementText, setAnnouncementText] = useState('')
  const [status, setStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!accessToken) return
    fetch('/api/deadpool/admin/pick-names', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => setPickNames(data.names || []))
      .catch(() => {})
  }, [accessToken])

  useEffect(() => {
    if (prefill) {
      setDisplayName(prefill.name)
      if (prefill.note) setAnnouncementText(prefill.note)
    }
  }, [prefill])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/deadpool/admin/hits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          displayName,
          dateOfDeath,
          ageAtDeath: Number(ageAtDeath),
          announcementText,
          submissionId: prefill?.id,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to record death' })
        return
      }

      setStatus({ type: 'success', message: `Recorded: ${data.hit.display_name}` })
      setDisplayName('')
      setAgeAtDeath('')
      setAnnouncementText('')
      onRecorded?.(data.hit)
    } catch {
      setStatus({ type: 'error', message: 'Failed to record death' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {prefill && (
        <div className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-gray-300 flex items-center justify-between">
          <span>Recording from a submitted tip{prefill.submittedBy ? ` by ${prefill.submittedBy}` : ''}.</span>
          <button type="button" onClick={onCancelPrefill} className="text-gray-500 hover:text-white">
            Clear
          </button>
        </div>
      )}

      <div>
        <label htmlFor="hitName" className="block text-sm text-gray-300 mb-1">
          Name
        </label>
        <input
          id="hitName"
          type="text"
          list="pick-names"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className={inputClass}
        />
        <datalist id="pick-names">
          {pickNames.map((entry) => (
            <option key={entry.name} value={entry.name}>
              {entry.count} pick{entry.count === 1 ? '' : 's'}
            </option>
          ))}
        </datalist>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="dateOfDeath" className="block text-sm text-gray-300 mb-1">
            Date of death
          </label>
          <input
            id="dateOfDeath"
            type="date"
            required
            value={dateOfDeath}
            onChange={(e) => setDateOfDeath(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="w-32">
          <label htmlFor="ageAtDeath" className="block text-sm text-gray-300 mb-1">
            Age
          </label>
          <input
            id="ageAtDeath"
            type="number"
            min={0}
            max={130}
            required
            value={ageAtDeath}
            onChange={(e) => setAgeAtDeath(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="announcementText" className="block text-sm text-gray-300 mb-1">
          Announcement blurb (optional)
        </label>
        <textarea
          id="announcementText"
          rows={3}
          value={announcementText}
          onChange={(e) => setAnnouncementText(e.target.value)}
          className={inputClass}
        />
      </div>

      {status && (
        <p className={status.type === 'error' ? 'text-red-400 text-sm' : 'text-green-400 text-sm'}>
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="bg-red-700 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Recording…' : 'Record Death'}
      </button>
    </form>
  )
}
