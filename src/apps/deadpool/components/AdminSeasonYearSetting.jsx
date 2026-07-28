'use client'

import { useEffect, useState } from 'react'

export default function AdminSeasonYearSetting({ seasonYear: initialSeasonYear, accessToken, onChanged }) {
  const [seasonYear, setSeasonYear] = useState(initialSeasonYear)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setSeasonYear(initialSeasonYear)
  }, [initialSeasonYear])

  const thisYear = new Date().getUTCFullYear()
  const options = [thisYear - 1, thisYear, thisYear + 1]
  // Defensive: if the persisted value ever falls outside that range (e.g.
  // set previously and the real calendar has since caught up), still show
  // it rather than silently mismatching the dropdown.
  if (seasonYear != null && !options.includes(seasonYear)) {
    options.push(seasonYear)
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
      onChanged?.(data.seasonYear)
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="seasonYear" className="text-sm text-gray-300">
        Active season
      </label>
      <select
        id="seasonYear"
        value={seasonYear ?? ''}
        onChange={handleChange}
        disabled={saving}
        className="bg-zinc-900 border border-zinc-700 text-white rounded px-3 py-1.5 disabled:opacity-50"
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
  )
}
