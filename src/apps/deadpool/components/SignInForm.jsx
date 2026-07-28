'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Panel, inputClass, labelClass, primaryButtonClass } from './ui.jsx'

export default function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotFound(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/deadpool/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'not_found') {
          setNotFound(true)
        } else {
          setError(data.error || 'Sign in failed')
        }
        return
      }

      router.push('/deadpool/picks')
      router.refresh()
    } catch {
      setError('Sign in failed')
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

        {notFound && (
          <p className="text-sm text-red-400">
            We don&apos;t recognize that email.{' '}
            <Link href="/deadpool/register" className="underline hover:text-red-300">
              New here? Register instead
            </Link>
            .
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </Panel>

      <button type="submit" disabled={submitting} className={primaryButtonClass}>
        {submitting ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="text-xs text-zinc-600">
        First time here?{' '}
        <Link href="/deadpool/register" className="text-red-400 underline hover:text-red-300">
          Register with your invite code
        </Link>
        .
      </p>
    </form>
  )
}
