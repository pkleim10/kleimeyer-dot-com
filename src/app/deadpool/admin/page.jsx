'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/utils/supabase'
import AdminHitForm from '@/apps/deadpool/components/AdminHitForm'
import AdminHitsTable from '@/apps/deadpool/components/AdminHitsTable'
import AdminSubmissionsQueue from '@/apps/deadpool/components/AdminSubmissionsQueue'
import AdminParticipantsTable from '@/apps/deadpool/components/AdminParticipantsTable'
import AdminSeasonYearSetting from '@/apps/deadpool/components/AdminSeasonYearSetting'
import AdminAnnouncements from '@/apps/deadpool/components/AdminAnnouncements'

export default function DeadpoolAdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const { isAdmin, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const [accessToken, setAccessToken] = useState(null)
  const [hits, setHits] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [participants, setParticipants] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [seasonYear, setSeasonYear] = useState(null)
  const [scheduledSeasonYear, setScheduledSeasonYear] = useState(null)
  const [prefill, setPrefill] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data?.session?.access_token || null)
    })
  }, [user])

  const loadData = useCallback(async (token) => {
    if (!token) return
    try {
      const [hitsRes, submissionsRes, participantsRes, settingsRes, announcementsRes] =
        await Promise.all([
          fetch('/api/deadpool/admin/hits', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/deadpool/admin/submissions', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/deadpool/admin/participants', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/deadpool/admin/settings', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/deadpool/admin/announcements', { headers: { Authorization: `Bearer ${token}` } }),
        ])
      const hitsData = await hitsRes.json()
      const submissionsData = await submissionsRes.json()
      const participantsData = await participantsRes.json()
      const settingsData = await settingsRes.json()
      const announcementsData = await announcementsRes.json()

      if (
        !hitsRes.ok ||
        !submissionsRes.ok ||
        !participantsRes.ok ||
        !settingsRes.ok ||
        !announcementsRes.ok
      ) {
        setLoadError(
          hitsData.error ||
            submissionsData.error ||
            participantsData.error ||
            settingsData.error ||
            announcementsData.error ||
            'Failed to load admin data'
        )
        return
      }

      setHits(hitsData.hits || [])
      setSubmissions(submissionsData.submissions || [])
      setParticipants(participantsData.participants || [])
      setSeasonYear(settingsData.seasonYear)
      setScheduledSeasonYear(settingsData.scheduledSeasonYear)
      setAnnouncements(announcementsData.announcements || [])
    } catch {
      setLoadError('Failed to load admin data')
    }
  }, [])

  useEffect(() => {
    if (accessToken) loadData(accessToken)
  }, [accessToken, loadData])

  function handleRecorded() {
    setPrefill(null)
    if (accessToken) loadData(accessToken)
  }

  function handleSeasonYearChanged() {
    // Participants/hits/submissions below are all scoped to the active
    // season, so switching it means re-fetching everything else too.
    if (accessToken) loadData(accessToken)
  }

  async function handleSignOut() {
    try {
      await signOut()
    } finally {
      router.push('/login')
    }
  }

  if (authLoading || permissionsLoading) {
    return <p className="text-gray-400 p-10">Loading…</p>
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-10">
        <p>
          Sign in at{' '}
          <Link href="/login" className="text-red-400 hover:text-red-300">
            /login
          </Link>{' '}
          first, then come back to this page.
        </p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-gray-100 flex items-center justify-center p-10">
        <p>You&apos;re signed in, but this account isn&apos;t an admin.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Dead Pool Admin</h1>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-gray-400 hover:text-white"
          >
            Sign Out
          </button>
        </div>

        {loadError && <p className="text-red-400 text-sm">{loadError}</p>}

        <section>
          <AdminSeasonYearSetting
            seasonYear={seasonYear}
            scheduledSeasonYear={scheduledSeasonYear}
            accessToken={accessToken}
            onChanged={handleSeasonYearChanged}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-500 mb-4">Pending Tips</h2>
          <AdminSubmissionsQueue submissions={submissions} accessToken={accessToken} onRecordFromSubmission={setPrefill} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-500 mb-4">Record a Death</h2>
          <AdminHitForm
            accessToken={accessToken}
            prefill={prefill}
            onRecorded={handleRecorded}
            onCancelPrefill={() => setPrefill(null)}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-500 mb-4">Post an Announcement</h2>
          <p className="mb-4 text-sm text-gray-500">
            General notices — deadlines, prize pot, trash talk. Recording a death below posts its own
            notice automatically.
          </p>
          <AdminAnnouncements
            announcements={announcements}
            accessToken={accessToken}
            onChanged={() => accessToken && loadData(accessToken)}
          />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-500 mb-4">Recorded Deaths</h2>
          <AdminHitsTable hits={hits} accessToken={accessToken} />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-red-500 mb-4">Participants</h2>
          <AdminParticipantsTable participants={participants} accessToken={accessToken} seasonYear={seasonYear} />
        </section>
      </div>
    </div>
  )
}
