'use client'

import { useEffect, useState } from 'react'
import { Panel, EmptyState, thClass } from './ui.jsx'
import { computeFingerprint, shortFingerprint } from '@/apps/deadpool/shared/sealedList'

// After the reveal, every fingerprint is recomputed here IN THE BROWSER from
// the published list and secret. Nothing about the verdict comes from the
// server — that's the point: any player can confirm for themselves that a
// revealed list is the one that was sealed.
export default function SealsTable({ seals, seasonYear, revealed, listsByParticipant }) {
  const [verdicts, setVerdicts] = useState({})

  useEffect(() => {
    if (!revealed) return
    let stale = false
    ;(async () => {
      const next = {}
      for (const seal of seals) {
        const names = listsByParticipant?.[seal.participantId]
        if (!names || seal.revealedSecret == null) continue
        const recomputed = await computeFingerprint({
          names,
          secret: seal.revealedSecret,
          seasonYear,
        })
        next[seal.id] = recomputed === seal.fingerprint ? 'match' : 'mismatch'
      }
      if (!stale) setVerdicts(next)
    })()
    return () => {
      stale = true
    }
  }, [seals, revealed, listsByParticipant, seasonYear])

  if (seals.length === 0) {
    return <EmptyState>No lists have been sealed yet this season.</EmptyState>
  }

  return (
    <div className="space-y-4">
      <Panel className="p-4">
        <p className="text-sm text-gray-400">
          {revealed
            ? 'Each fingerprint below is recomputed in your own browser from the published list and secret. A match proves that list is exactly what was sealed before the deadline.'
            : 'These fingerprints were committed before the deadline and are visible to everyone, so none can be quietly changed. The lists behind them stay hidden until the season opens.'}
        </p>
      </Panel>

      <Panel className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className={`${thClass} pl-4`}>Team</th>
              <th className={thClass}>Fingerprint</th>
              <th className={thClass}>Sealed</th>
              {revealed && <th className={`${thClass} pr-4`}>Verified</th>}
            </tr>
          </thead>
          <tbody>
            {seals.map((seal) => {
              const verdict = verdicts[seal.id]
              return (
                <tr key={seal.id} className="border-b border-zinc-900/70 last:border-0">
                  <td className="py-3 pl-4 pr-4 text-white">{seal.displayName || '—'}</td>
                  <td className="py-3 pr-4 font-mono text-sm text-red-400">
                    {shortFingerprint(seal.fingerprint)}…
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-sm text-gray-400">
                    {new Date(seal.sealedAt).toLocaleDateString()}
                  </td>
                  {revealed && (
                    <td className="py-3 pr-4 text-sm">
                      {verdict === 'match' && <span className="text-green-400">✓ matches</span>}
                      {verdict === 'mismatch' && (
                        <span className="text-red-400">✗ does not match</span>
                      )}
                      {!verdict && <span className="text-zinc-600">not revealed yet</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}
