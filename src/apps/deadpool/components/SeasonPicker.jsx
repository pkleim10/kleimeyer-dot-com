'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SeasonPicker({
  seasonYear,
  availableYears,
  className = '',
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const years = availableYears?.length ? availableYears : [seasonYear]
  const nextYear = years.length > 1 ? years[years.length - 1] : null
  const showNextHint = nextYear != null && nextYear !== seasonYear

  async function handleChange(e) {
    const next = Number(e.target.value)
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/deadpool/season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seasonYear: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to switch season')
        return
      }
      router.refresh()
    } catch {
      setError('Failed to switch season')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <label
          htmlFor="deadpoolSeason"
          className="font-display text-[11px] uppercase tracking-[0.14em] text-zinc-500"
        >
          Season
        </label>
        <select
          id="deadpoolSeason"
          value={seasonYear}
          onChange={handleChange}
          disabled={saving || years.length < 2}
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-display text-sm text-red-400 disabled:opacity-60"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
      {showNextHint && (
        <p className="max-w-[16rem] text-right text-[11px] leading-snug text-zinc-500">
          {nextYear} is open for sealing — select it to enter next year&apos;s pool.
        </p>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
