'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Panel, inputClass, labelClass, primaryButtonClass } from './ui.jsx'
import { buildRegistrationMailto } from '../shared/registration'

export default function RegisterForm({ seasonYear }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/deadpool/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, inviteCode }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }

      router.push('/deadpool/picks')
      router.refresh()
    } catch {
      setError('Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Panel className="space-y-4 p-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="displayName" className={labelClass}>
            Team name
          </label>
          <input
            id="displayName"
            type="text"
            required
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Make it memorable"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="inviteCode" className={labelClass}>
            Registration code
          </label>
          <input
            id="inviteCode"
            type="text"
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className={inputClass}
          />
          <p className="mt-2 text-xs text-zinc-500">
            If you don&apos;t have a registration code yet, you can request one from{' '}
            <a
              href={buildRegistrationMailto(seasonYear)}
              className="text-red-400 underline hover:text-red-300"
            >
              The Commissioner
            </a>
            .
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </Panel>

      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? 'Joining…' : 'Join the Pool'}
      </button>

      <p className="text-xs text-zinc-600">
        Already registered on another device?{' '}
        <Link href="/deadpool/signin" className="text-red-400 underline hover:text-red-300">
          Sign in instead
        </Link>{' '}
        — no need to dig up the registration code again.
      </p>
    </form>
  )
}
