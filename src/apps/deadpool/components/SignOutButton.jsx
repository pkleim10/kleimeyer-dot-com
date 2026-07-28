'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignOutButton() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await fetch('/api/deadpool/logout', { method: 'POST' })
    } finally {
      router.push('/deadpool')
      router.refresh()
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={signingOut}
      className="text-gray-300 hover:text-white disabled:opacity-50"
    >
      {signingOut ? 'Signing out…' : 'Sign Out'}
    </button>
  )
}
