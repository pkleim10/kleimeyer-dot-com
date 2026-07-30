'use client'

import { useEffect, useState } from 'react'
import { Panel, SectionTitle, inputClass, labelClass, primaryButtonClass } from './ui.jsx'
import { fingerprintPastedList, shortFingerprint } from '@/apps/deadpool/shared/sealedList'
import { validatePickList, MAX_PICKS } from '@/apps/deadpool/server/validation'

// Before the lock this component never sends the list anywhere: it hashes in
// the browser and posts only the fingerprint. After the lock it sends the
// plaintext once, to be verified against that fingerprint.
export default function SealedListEditor({ seasonYear, canSeal, initialSeal, revealed }) {
  const [listText, setListText] = useState('')
  const [secret, setSecret] = useState('')
  const [parsed, setParsed] = useState({ names: [], fingerprint: '' })
  const [seal, setSeal] = useState(initialSeal)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  const validation = validatePickList(parsed.names)
  const hasInput = parsed.names.length > 0 && secret.trim().length > 0

  // Recompute the fingerprint as they type. Hashing is async, so guard against
  // an earlier keystroke's result landing after a later one.
  useEffect(() => {
    let stale = false
    if (!listText.trim() || !secret.trim()) {
      setParsed({ names: [], fingerprint: '' })
      return () => {}
    }
    fingerprintPastedList({ text: listText, secret, seasonYear }).then((result) => {
      if (!stale) setParsed(result)
    })
    return () => {
      stale = true
    }
  }, [listText, secret, seasonYear])

  async function handleSeal() {
    setStatus(null)
    setBusy(true)
    try {
      const res = await fetch('/api/deadpool/seals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only the fingerprint. Never the list, never the secret.
        body: JSON.stringify({ fingerprint: parsed.fingerprint }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to seal' })
        return
      }
      setSeal(data.seal)
      setStatus({ type: 'success', message: 'Sealed. Keep your file safe — you will need it in January.' })
    } catch {
      setStatus({ type: 'error', message: 'Failed to seal' })
    } finally {
      setBusy(false)
    }
  }

  async function handleReveal() {
    setStatus(null)
    setBusy(true)
    try {
      const res = await fetch('/api/deadpool/seals/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list: listText, secret }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to reveal' })
        return
      }
      setStatus({
        type: 'success',
        message: `Revealed — ${data.picks.length} picks are now public and locked.`,
      })
    } catch {
      setStatus({ type: 'error', message: 'Failed to reveal' })
    } finally {
      setBusy(false)
    }
  }

  const matchesSeal = seal && parsed.fingerprint && parsed.fingerprint === seal.fingerprint

  return (
    <div className="space-y-5">
      {/* The envelope only exists once a list is sealed — it's the state, not
          decoration. After the reveal it's shown broken open and drained of
          colour, so the page reads at a glance: nothing / sealed / opened. */}
      {seal && (
        <Panel className="flex flex-wrap items-center gap-5 p-5">
          {/* The artwork is opaque with a black background, so its edges are
              masked to TRANSPARENT rather than faded to black — the panel
              behind it isn't black, so fading to black would just paint a
              darker box. Masks are reliable on <img> in every engine. */}
          <img
            src="/deadpool/seal.png"
            alt={revealed ? 'A broken wax seal on an opened envelope' : 'A wax-sealed envelope'}
            className={`block w-32 shrink-0 transition duration-700 sm:w-40 ${
              revealed ? 'opacity-40 grayscale' : ''
            }`}
            style={{
              WebkitMaskImage: 'radial-gradient(ellipse 62% 62% at 50% 50%, #000 45%, transparent 78%)',
              maskImage: 'radial-gradient(ellipse 62% 62% at 50% 50%, #000 45%, transparent 78%)',
            }}
          />

          <div className="min-w-0 flex-1">
            <SectionTitle className="mb-2">
              {revealed ? 'Your list is open' : 'Your list is sealed'}
            </SectionTitle>
            <p className="break-all font-mono text-sm text-red-400">
              {shortFingerprint(seal.fingerprint)}…
            </p>
            <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em] text-zinc-600">
              Sealed {new Date(seal.sealedAt ?? seal.sealed_at).toLocaleString()}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-zinc-500">
              {revealed
                ? 'The seal has been broken and your list is public. Anyone can check it against this impression.'
                : 'This impression is public; the list behind it is not. Only you hold that.'}
            </p>
          </div>
        </Panel>
      )}

      <Panel className="space-y-4 p-5">
        <div>
          <label htmlFor="listText" className={labelClass}>
            Your list — paste it from your own file
          </label>
          <textarea
            id="listText"
            rows={10}
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            placeholder={'1. Keith Richards\n2. Willie Nelson\n…'}
            className={`${inputClass} font-mono text-sm`}
          />
          <p className="mt-1.5 text-xs text-zinc-600">
            Numbered, bulleted or bare lines all work. Order and capitalisation don&apos;t matter.
          </p>
        </div>

        <div>
          <label htmlFor="secret" className={labelClass}>
            Your secret
          </label>
          <input
            id="secret"
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="A word only you know"
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-zinc-600">
            Keep this with your list. Without it nobody — including you — can prove which list you
            sealed.
          </p>
        </div>

        {hasInput && (
          <div className="rounded-lg border border-zinc-800 bg-black/40 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                {parsed.names.length} {parsed.names.length === 1 ? 'name' : 'names'} read
              </span>
              <span className="font-mono text-sm text-red-400">
                {shortFingerprint(parsed.fingerprint)}…
              </span>
            </div>

            {validation.error ? (
              <p className="mt-2 text-sm text-red-400">{validation.error}</p>
            ) : (
              <ol className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {parsed.names.map((name, i) => (
                  <li key={`${name}-${i}`} className="flex gap-2">
                    <span className="w-5 shrink-0 text-right font-display text-xs text-zinc-600">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-gray-200">{name}</span>
                  </li>
                ))}
              </ol>
            )}

            {seal && (
              <p className={`mt-3 text-xs ${matchesSeal ? 'text-green-400' : 'text-amber-400'}`}>
                {matchesSeal
                  ? 'This matches your sealed list.'
                  : 'This does NOT match your sealed list.'}
              </p>
            )}
          </div>
        )}

        {status && (
          <p className={`text-sm ${status.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
            {status.message}
          </p>
        )}
      </Panel>

      <div className="flex flex-wrap items-center gap-4">
        {canSeal ? (
          <button
            type="button"
            onClick={handleSeal}
            disabled={busy || !hasInput || Boolean(validation.error)}
            className={primaryButtonClass}
          >
            {busy ? 'Sealing…' : seal ? 'Re-seal my list' : 'Seal my list'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReveal}
            disabled={busy || !hasInput}
            className={primaryButtonClass}
          >
            {busy ? 'Revealing…' : 'Reveal my list'}
          </button>
        )}
        <p className="text-xs text-zinc-600">
          {canSeal
            ? `Up to ${MAX_PICKS} names. Sealing again before the deadline is fine.`
            : 'Paste the same list and secret you sealed with.'}
        </p>
      </div>

      {canSeal ? (
        <Panel className="border-amber-900/50 p-4">
          <p className="text-sm text-amber-200/80">
            <span className="font-display uppercase tracking-[0.14em] text-amber-300">Important</span>{' '}
            — your list is never uploaded before January 1, {seasonYear}; only its fingerprint is.
            Keep your list and secret in your own file. If you lose them you cannot enter, because
            nobody has a copy.
          </p>
        </Panel>
      ) : (
        <Panel className="border-amber-900/50 p-4">
          <p className="text-sm text-amber-200/80">
            <span className="font-display uppercase tracking-[0.14em] text-amber-300">Reveal now</span>{' '}
            — sealing has closed. You must paste your list to enter the pool; a sealed fingerprint
            alone doesn&apos;t count.
          </p>
        </Panel>
      )}
    </div>
  )
}
