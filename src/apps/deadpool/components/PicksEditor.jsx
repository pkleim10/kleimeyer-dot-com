'use client'

import { useState } from 'react'
import { Panel, inputClass, primaryButtonClass } from './ui.jsx'

const MAX_PICKS = 20

export default function PicksEditor({ initialPicks, isEditable, deadline }) {
  const [names, setNames] = useState(initialPicks.length > 0 ? initialPicks.map((p) => p.name) : [''])
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  function updateName(index, value) {
    setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
  }

  function addRow() {
    setNames((prev) => (prev.length >= MAX_PICKS ? prev : [...prev, '']))
  }

  function removeRow(index) {
    setNames((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setStatus(null)
    setSaving(true)
    try {
      const res = await fetch('/api/deadpool/picks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to save' })
        return
      }

      setNames(data.picks.length > 0 ? data.picks.map((p) => p.name) : [''])
      setStatus({ type: 'success', message: 'List saved.' })
    } catch {
      setStatus({ type: 'error', message: 'Failed to save' })
    } finally {
      setSaving(false)
    }
  }

  if (!isEditable) {
    const finalNames = names.filter((n) => n.trim())
    return (
      <div className="space-y-4">
        <Panel className="border-amber-900/50 p-4">
          <p className="text-sm text-amber-200/80">
            <span className="font-display uppercase tracking-[0.14em] text-amber-300">Locked</span> —
            picks closed for this season on {new Date(deadline).toLocaleDateString()}.
          </p>
        </Panel>
        <Panel className="p-5">
          {finalNames.length === 0 ? (
            <p className="text-sm text-zinc-600">You didn&apos;t submit any picks this season.</p>
          ) : (
            <ol className="space-y-2">
              {finalNames.map((name, index) => (
                <li key={name} className="flex items-baseline gap-3 text-sm">
                  <span className="font-display text-xs text-zinc-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="text-gray-200">{name}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    )
  }

  const nonBlankCount = names.filter((n) => n.trim()).length
  const fillPercent = Math.round((nonBlankCount / MAX_PICKS) * 100)

  return (
    <div className="space-y-4">
      <Panel className="p-5">
        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em]">
            <span className="text-zinc-500">Your list</span>
            <span className="text-zinc-400">
              <span className="font-display text-base text-red-400">{nonBlankCount}</span>
              <span className="text-zinc-600"> / {MAX_PICKS}</span>
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
            role="progressbar"
            aria-valuenow={nonBlankCount}
            aria-valuemin={0}
            aria-valuemax={MAX_PICKS}
            aria-label="Picks used"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-800 to-red-500 transition-all"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          {names.map((name, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-right font-display text-xs text-zinc-600">
                {String(index + 1).padStart(2, '0')}
              </span>
              <input
                type="text"
                value={name}
                maxLength={100}
                onChange={(e) => updateName(index, e.target.value)}
                placeholder="Name a mortal…"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="shrink-0 rounded px-2 py-1 text-zinc-600 transition hover:bg-red-950/40 hover:text-red-400"
                aria-label={`Remove pick ${index + 1}`}
              >
                &#10005;
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          disabled={names.length >= MAX_PICKS}
          className="mt-3 text-sm text-red-400 transition hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add a name
        </button>
      </Panel>

      <div className="flex flex-wrap items-center gap-4">
        <button type="button" onClick={handleSave} disabled={saving} className={primaryButtonClass}>
          {saving ? 'Saving…' : 'Save List'}
        </button>
        {status && (
          <p className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {status.message}
          </p>
        )}
      </div>
    </div>
  )
}
