'use client'

import { useEffect, useState } from 'react'

export default function AdminSeasonYearSetting({
  seasonYear: initialSeasonYear,
  scheduledSeasonYear: initialScheduled,
  accessToken,
  onChanged,
}) {
  const [seasonYear, setSeasonYear] = useState(initialSeasonYear)
  const [scheduledSeasonYear, setScheduledSeasonYear] = useState(initialScheduled)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setSeasonYear(initialSeasonYear)
    setScheduledSeasonYear(initialScheduled)
  }, [initialSeasonYear, initialScheduled])

  const thisYear = new Date().getUTCFullYear()
  const options = [thisYear - 1, thisYear, thisYear + 1]
  if (seasonYear != null && !options.includes(seasonYear)) {
    options.push(seasonYear)
    options.sort((a, b) => a - b)
  }
  if (scheduledSeasonYear != null && !options.includes(scheduledSeasonYear)) {
    options.push(scheduledSeasonYear)
    options.sort((a, b) => a - b)
  }

  async function handleChange(e) {
    const nextYear = Number(e.target.value)
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/deadpool/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ seasonYear: nextYear }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to save')
        return
      }
      setSeasonYear(data.seasonYear)
      setScheduledSeasonYear(data.scheduledSeasonYear)
      onChanged?.(data)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="seasonYear" className="text-sm text-gray-300">
          Admin season
        </label>
        <select
          id="seasonYear"
          value={seasonYear ?? ''}
          onChange={handleChange}
          disabled={saving}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-white disabled:opacity-50"
        >
          {options.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        {saving && <span className="text-xs text-gray-500">Saving…</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        Scopes hit recording and tip review. Players pick their own season on the main page (next year
        becomes selectable from July 1; schedule would offer{' '}
        <span className="text-zinc-300">{scheduledSeasonYear ?? '—'}</span>).
      </p>
    </div>
  )
}
