'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/utils/supabase'
import { computeLeaseProjection, leaseEndExclusive, totalMilesFromAnnual } from './leaseProjection'

/** Read DB-shaped row with snake_case or camelCase keys. Use `in` (not hasOwnProperty) — some clients omit own-property flags. */
function rowVal(row, snakeKey) {
  if (row == null || typeof row !== 'object') return undefined
  const camel = snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  if (snakeKey in row) return row[snakeKey]
  if (camel in row) return row[camel]
  return undefined
}

function emptyForm() {
  return {
    vehicleName: '',
    leaseStartDate: '',
    leasePeriodMonths: '36',
    initialOdometer: '',
    allocationMode: 'total',
    annualMiles: '',
    totalAllocatedMiles: '',
    overageCostPerMile: '0.25',
  }
}

function leaseFormSnapshot(f) {
  return JSON.stringify({
    vehicleName: f.vehicleName,
    leaseStartDate: f.leaseStartDate,
    leasePeriodMonths: f.leasePeriodMonths,
    initialOdometer: f.initialOdometer,
    allocationMode: f.allocationMode,
    annualMiles: f.annualMiles,
    totalAllocatedMiles: f.totalAllocatedMiles,
    overageCostPerMile: f.overageCostPerMile,
  })
}

function rowToForm(row) {
  const rawBasis = rowVal(row, 'mileage_allocation_basis')
  let allocationMode = null
  if (typeof rawBasis === 'string') {
    const s = rawBasis.trim().toLowerCase()
    if (s === 'annual' || s === 'total') allocationMode = s
  }

  const annual = rowVal(row, 'annual_allocated_miles')
  const hasAnnual = annual != null && Number(annual) > 0

  if (allocationMode == null) {
    allocationMode = hasAnnual ? 'annual' : 'total'
  }
  // DB default is 'total'; rows can have annual miles while basis stayed 'total'.
  if (allocationMode === 'total' && hasAnnual) {
    allocationMode = 'annual'
  }
  // If the DB says 'annual', keep it — do not force 'total' when annual miles is missing from
  // the row payload (e.g. partial select) or zero; the radio must match Supabase.

  const showAnnualFields = allocationMode === 'annual'
  return {
    vehicleName: rowVal(row, 'vehicle_name') ?? '',
    leaseStartDate: rowVal(row, 'lease_start_date') ?? '',
    leasePeriodMonths: String(rowVal(row, 'lease_period_months') ?? 36),
    initialOdometer: String(rowVal(row, 'initial_odometer') ?? ''),
    allocationMode,
    annualMiles: showAnnualFields ? String(annual ?? '') : '',
    totalAllocatedMiles: String(rowVal(row, 'total_allocated_miles') ?? ''),
    overageCostPerMile: String(rowVal(row, 'overage_cost_per_mile') ?? ''),
  }
}

function formatShortDate(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Canonical YYYY-MM-DD for save; also used after manual ISO entry if we add text fallback again. */
function tryNormalizeLeaseStartYmd(s) {
  const t = String(s ?? '').trim()
  if (!t) return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const [y, mo, d] = t.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return t
  const dt = new Date(y, mo - 1, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return t
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isValidCalendarYmd(s) {
  const t = String(s ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return false
  const [y, mo, d] = t.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return false
  const dt = new Date(y, mo - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
}

/** Human-readable age for a saved odometer timestamp (calendar-day based). Omits when saved date is today. */
function formatReadingAge(iso) {
  if (iso == null || iso === '') return null
  const recorded = new Date(iso)
  if (Number.isNaN(recorded.getTime())) return null
  const startRecorded = new Date(recorded.getFullYear(), recorded.getMonth(), recorded.getDate())
  const now = new Date()
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((startNow - startRecorded) / 86400000)
  if (days <= 0) return null
  if (days === 1) return 'as of yesterday'
  return `as of ${days} days ago`
}

function leaseLastDayInclusive(leaseStartYmd, periodMonths) {
  const ex = leaseEndExclusive(leaseStartYmd, periodMonths)
  const last = new Date(ex)
  last.setDate(last.getDate() - 1)
  return last
}

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function leaseMinderSelectedStorageKey(userId) {
  return `leaseMinder_selectedId_${userId}`
}

const LEASE_MINDER_PATH = '/other-fun-stuff/LeaseMinder'

function subscribeLeaseMinderLg(cb) {
  const mq = window.matchMedia('(min-width: 1024px)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
function getLeaseMinderLgSnapshot() {
  return window.matchMedia('(min-width: 1024px)').matches
}
function getLeaseMinderLgServerSnapshot() {
  return true
}

export default function LeaseMinderApp() {
  const params = useParams()
  const router = useRouter()
  const isLg = useSyncExternalStore(subscribeLeaseMinderLg, getLeaseMinderLgSnapshot, getLeaseMinderLgServerSnapshot)
  const routeLeaseIdRaw = params?.leaseId
  const routeLeaseId = Array.isArray(routeLeaseIdRaw) ? routeLeaseIdRaw[0] : routeLeaseIdRaw
  const { user, loading: authLoading } = useAuth()
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  /** Draft value for "current odometer" (saved to DB on blur). */
  const [currentOdoDraft, setCurrentOdoDraft] = useState('')
  const [odometerSaving, setOdometerSaving] = useState(false)

  const loadLeases = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    const { data, error: qErr } = await supabase
      .from('leased_vehicles')
      .select('*')
      .order('vehicle_name', { ascending: true })

    if (qErr) {
      console.error(qErr)
      setError(
        qErr.code === '42P01'
          ? 'Database table missing. Run the migration migrations/create_leased_vehicles.sql in Supabase.'
          : qErr.message || 'Could not load leases.'
      )
      setLeases([])
    } else {
      const list = data || []
      setLeases(list)
      // Restore selection in the same async turn as setLeases so React batches one commit.
      // Otherwise a paint can occur with leases loaded + selectedId still null → wrong radios until useLayoutEffect.
      if (typeof window !== 'undefined' && user?.id && window.matchMedia('(min-width: 1024px)').matches) {
        try {
          const saved = sessionStorage.getItem(leaseMinderSelectedStorageKey(user.id))
          if (saved) {
            const row = list.find((r) => r.id === saved)
            if (row) {
              setSelectedId(saved)
              setForm(rowToForm(row))
            } else {
              sessionStorage.removeItem(leaseMinderSelectedStorageKey(user.id))
            }
          }
        } catch (_) {
          /* ignore */
        }
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading && user) loadLeases()
    if (!authLoading && !user) {
      setLeases([])
      setLoading(false)
      setSelectedId(null)
      setForm(emptyForm())
      try {
        if (typeof window !== 'undefined') {
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const k = sessionStorage.key(i)
            if (k?.startsWith('leaseMinder_selectedId_')) sessionStorage.removeItem(k)
          }
        }
      } catch (_) {
        /* ignore quota / private mode */
      }
    }
  }, [authLoading, user, loadLeases])

  const selected = useMemo(
    () => leases.find((r) => r.id === selectedId) || null,
    [leases, selectedId]
  )

  /** Fingerprint server row so we re-hydrate the form when Supabase data changes, without clobbering on every render. */
  const selectedLeaseSnapshot = useMemo(() => {
    if (!selectedId) return null
    const row = leases.find((r) => r.id === selectedId)
    if (!row) return null
    return JSON.stringify({
      id: row.id,
      basis: rowVal(row, 'mileage_allocation_basis'),
      annual: rowVal(row, 'annual_allocated_miles'),
      total: rowVal(row, 'total_allocated_miles'),
      months: rowVal(row, 'lease_period_months'),
      start: rowVal(row, 'lease_start_date'),
      initial: rowVal(row, 'initial_odometer'),
      overage: rowVal(row, 'overage_cost_per_mile'),
      current_odometer: rowVal(row, 'current_odometer'),
      current_odometer_recorded_at: rowVal(row, 'current_odometer_recorded_at'),
      updated_at: rowVal(row, 'updated_at'),
    })
  }, [leases, selectedId])

  const isLeaseFormDirty = useMemo(() => {
    if (selectedId != null && !selected) return false
    const baseline = !selectedId ? leaseFormSnapshot(emptyForm()) : leaseFormSnapshot(rowToForm(selected))
    return leaseFormSnapshot(form) !== baseline
  }, [form, selectedId, selected])

  // Only persist when a lease is selected. Do not remove on selectedId === null here — that runs on
  // initial mount before restore and would erase the saved id. Clear storage in handleNew / logout.
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id || !selectedId) return
    try {
      sessionStorage.setItem(leaseMinderSelectedStorageKey(user.id), selectedId)
    } catch (_) {
      /* ignore */
    }
  }, [selectedId, user?.id])

  // useLayoutEffect: keep form in sync with the selected row before paint. A keyed fieldset remounting
  // radios could otherwise show the wrong checked state while form state was already correct.
  useLayoutEffect(() => {
    if (!selectedId) return
    const row = leases.find((r) => r.id === selectedId)
    if (!row) {
      if (loading) return
      try {
        if (typeof window !== 'undefined' && user?.id) {
          sessionStorage.removeItem(leaseMinderSelectedStorageKey(user.id))
        }
      } catch (_) {
        /* ignore */
      }
      setSelectedId(null)
      setForm(emptyForm())
      return
    }
    setForm(rowToForm(row))
  }, [selectedId, selectedLeaseSnapshot, loading, user?.id])

  const selectLease = (row) => {
    const next = rowToForm(row)
    setSelectedId(row.id)
    // Same-tick as click so first paint matches DB (useEffect runs after paint — was leaving allocationMode on default 'total').
    setForm(next)
    setCurrentOdoDraft(String(rowVal(row, 'current_odometer') ?? ''))
  }

  useEffect(() => {
    if (routeLeaseId === 'new') {
      setSelectedId(null)
      setForm(emptyForm())
      setCurrentOdoDraft('')
      return
    }
    if (!routeLeaseId) return
    const row = leases.find((r) => r.id === routeLeaseId)
    if (row) {
      setSelectedId(row.id)
      setForm(rowToForm(row))
      setCurrentOdoDraft(String(rowVal(row, 'current_odometer') ?? ''))
      return
    }
    if (loading) return
    router.replace(LEASE_MINDER_PATH)
  }, [routeLeaseId, leases, loading, router])

  useEffect(() => {
    if (!selectedId || !selected) {
      setCurrentOdoDraft('')
      return
    }
    setCurrentOdoDraft(String(rowVal(selected, 'current_odometer') ?? ''))
  }, [selectedId, selected, selectedLeaseSnapshot])

  const savedCurrentOdo = selected != null ? rowVal(selected, 'current_odometer') : undefined
  const savedCurrentOdoAt = selected != null ? rowVal(selected, 'current_odometer_recorded_at') : undefined

  const currentOdoForProjection = useMemo(() => {
    if (!selected) return ''
    const d = String(currentOdoDraft ?? '').trim()
    if (d !== '') return currentOdoDraft
    const s = savedCurrentOdo
    return s != null && s !== '' ? String(s) : ''
  }, [selected, currentOdoDraft, savedCurrentOdo])

  const persistCurrentOdometer = useCallback(async () => {
    if (!user || !selectedId || !selected) return
    const trimmed = String(currentOdoDraft ?? '').trim()
    const savedNum =
      savedCurrentOdo != null && String(savedCurrentOdo).trim() !== ''
        ? Number(String(savedCurrentOdo).replace(/,/g, ''))
        : null

    let nextOdo = null
    let nextAt = null

    if (trimmed === '') {
      if (savedNum == null || !Number.isFinite(savedNum)) return
    } else {
      const n = parseInt(trimmed.replace(/,/g, ''), 10)
      if (!Number.isFinite(n) || n < 0) {
        setError('Current odometer must be a valid non-negative number.')
        setCurrentOdoDraft(savedNum != null && Number.isFinite(savedNum) ? String(savedNum) : '')
        return
      }
      if (savedNum != null && Number.isFinite(savedNum) && n === savedNum) return
      nextOdo = n
      nextAt = new Date().toISOString()
    }

    setOdometerSaving(true)
    setError(null)
    try {
      const { data, error: uErr } = await supabase
        .from('leased_vehicles')
        .update({
          current_odometer: nextOdo,
          current_odometer_recorded_at: nextAt,
        })
        .eq('id', selectedId)
        .eq('user_id', user.id)
        .select()
        .single()
      if (uErr) throw uErr
      setLeases((prev) => prev.map((r) => (r.id === selectedId ? data : r)).sort((a, b) => a.vehicle_name.localeCompare(b.vehicle_name)))
      setCurrentOdoDraft(String(rowVal(data, 'current_odometer') ?? ''))
    } catch (e) {
      console.error(e)
      setError(e.message || 'Could not save odometer reading.')
      setCurrentOdoDraft(savedNum != null && Number.isFinite(savedNum) ? String(savedNum) : '')
    } finally {
      setOdometerSaving(false)
    }
  }, [user, selectedId, selected, savedCurrentOdo, currentOdoDraft])

  const projection = useMemo(() => {
    if (!selected || currentOdoForProjection === '' || currentOdoForProjection == null) return null
    const current = Number(String(currentOdoForProjection).replace(/,/g, ''))
    if (!Number.isFinite(current)) return null
    const total = Number(form.totalAllocatedMiles)
    const initial = Number(form.initialOdometer)
    const months = Number(form.leasePeriodMonths)
    const overage = Number(form.overageCostPerMile)
    if (!form.leaseStartDate || !Number.isFinite(total) || !Number.isFinite(initial) || !Number.isFinite(months)) {
      return null
    }
    return computeLeaseProjection({
      leaseStartYmd: form.leaseStartDate,
      leasePeriodMonths: months,
      initialOdometer: initial,
      totalAllocatedMiles: total,
      currentOdometer: current,
      overageCostPerMile: overage,
    })
  }, [selected, currentOdoForProjection, form])

  const updateField = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'allocationMode' && value === 'annual' && f.annualMiles && f.leasePeriodMonths) {
        const ann = Number(f.annualMiles)
        const mo = Number(f.leasePeriodMonths)
        if (Number.isFinite(ann) && Number.isFinite(mo)) {
          next.totalAllocatedMiles = String(totalMilesFromAnnual(ann, mo))
        }
      }
      if (key === 'annualMiles' && f.allocationMode === 'annual') {
        const ann = Number(value)
        const mo = Number(f.leasePeriodMonths)
        if (Number.isFinite(ann) && Number.isFinite(mo)) {
          next.totalAllocatedMiles = String(totalMilesFromAnnual(ann, mo))
        }
      }
      if (key === 'leasePeriodMonths' && f.allocationMode === 'annual') {
        const ann = Number(f.annualMiles)
        const mo = Number(value)
        if (Number.isFinite(ann) && Number.isFinite(mo)) {
          next.totalAllocatedMiles = String(totalMilesFromAnnual(ann, mo))
        }
      }
      return next
    })
  }

  const buildPayload = () => {
    const months = parseInt(form.leasePeriodMonths, 10)
    const initial = parseInt(String(form.initialOdometer).replace(/,/g, ''), 10)
    const overage = parseFloat(String(form.overageCostPerMile))
    let total = parseInt(String(form.totalAllocatedMiles).replace(/,/g, ''), 10)
    let annual = null
    if (form.allocationMode === 'annual') {
      const a = parseInt(String(form.annualMiles).replace(/,/g, ''), 10)
      if (!Number.isFinite(a) || a <= 0) throw new Error('Enter a valid annual mileage allowance.')
      annual = a
      total = totalMilesFromAnnual(a, months)
    } else {
      if (!Number.isFinite(total) || total <= 0) throw new Error('Enter a valid total allocated miles.')
    }
    if (!form.vehicleName.trim()) throw new Error('Vehicle name is required.')
    const leaseStartTrim = String(form.leaseStartDate ?? '').trim()
    if (!leaseStartTrim) throw new Error('Lease start date is required.')
    if (!isValidCalendarYmd(leaseStartTrim)) {
      throw new Error('Lease start date must be a valid calendar day as YYYY-MM-DD.')
    }
    if (!Number.isFinite(months) || months < 1) throw new Error('Lease period (months) must be at least 1.')
    if (!Number.isFinite(initial) || initial < 0) throw new Error('Initial odometer must be zero or positive.')
    if (!Number.isFinite(overage) || overage < 0) throw new Error('Overage cost per mile must be zero or positive.')

    return {
      vehicle_name: form.vehicleName.trim(),
      lease_start_date: tryNormalizeLeaseStartYmd(leaseStartTrim),
      lease_period_months: months,
      initial_odometer: initial,
      mileage_allocation_basis: form.allocationMode,
      annual_allocated_miles: form.allocationMode === 'annual' ? annual : null,
      total_allocated_miles: total,
      overage_cost_per_mile: overage,
    }
  }

  const handleSave = async () => {
    if (!user) return
    try {
      const payload = buildPayload()
      setSaving(true)
      setError(null)
      if (selectedId) {
        const { data, error: uErr } = await supabase
          .from('leased_vehicles')
          .update(payload)
          .eq('id', selectedId)
          .eq('user_id', user.id)
          .select()
          .single()
        if (uErr) throw uErr
        setLeases((prev) => prev.map((r) => (r.id === selectedId ? data : r)).sort((a, b) => a.vehicle_name.localeCompare(b.vehicle_name)))
        afterSaveSelect(data)
      } else {
        const { data, error: iErr } = await supabase
          .from('leased_vehicles')
          .insert({ ...payload, user_id: user.id })
          .select()
          .single()
        if (iErr) throw iErr
        setLeases((prev) => [...prev, data].sort((a, b) => a.vehicle_name.localeCompare(b.vehicle_name)))
        afterSaveSelect(data)
      }
    } catch (e) {
      console.error(e)
      setError(e.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user || !selectedId) return
    if (!window.confirm('Delete this lease record? This cannot be undone.')) return
    setSaving(true)
    setError(null)
    const { error: dErr } = await supabase.from('leased_vehicles').delete().eq('id', selectedId).eq('user_id', user.id)
    setSaving(false)
    if (dErr) {
      setError(dErr.message || 'Delete failed.')
      return
    }
    setLeases((prev) => prev.filter((r) => r.id !== selectedId))
    try {
      if (typeof window !== 'undefined' && user?.id) {
        sessionStorage.removeItem(leaseMinderSelectedStorageKey(user.id))
      }
    } catch (_) {
      /* ignore */
    }
    setSelectedId(null)
    setForm(emptyForm())
    setCurrentOdoDraft('')
    if (routeLeaseId) {
      router.push(LEASE_MINDER_PATH)
    }
  }

  const handleNew = () => {
    try {
      if (typeof window !== 'undefined' && user?.id) {
        sessionStorage.removeItem(leaseMinderSelectedStorageKey(user.id))
      }
    } catch (_) {
      /* ignore */
    }
    if (!isLg) {
      router.push(`${LEASE_MINDER_PATH}/new`)
      return
    }
    setSelectedId(null)
    setForm(emptyForm())
    setCurrentOdoDraft('')
  }

  const afterSaveSelect = (row) => {
    setSelectedId(row.id)
    setForm(rowToForm(row))
    if (!isLg) {
      router.replace(`${LEASE_MINDER_PATH}/${row.id}`)
    }
  }

  if (authLoading) {
    return <p className="text-gray-600 dark:text-gray-400">Loading…</p>
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-6 text-amber-900 dark:text-amber-200">
        <p className="font-medium">Sign in to manage your leases</p>
        <p className="mt-2 text-sm opacity-90">
          Lease records are stored in your account.{' '}
          <Link href="/login" className="underline font-semibold">
            Sign in
          </Link>{' '}
          to continue.
        </p>
      </div>
    )
  }

  const lastDay =
    form.leaseStartDate && form.leasePeriodMonths
      ? leaseLastDayInclusive(form.leaseStartDate, parseInt(form.leasePeriodMonths, 10) || 0)
      : null

  return (
    <div className="min-w-0 space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:gap-8 min-h-[480px]">
        {/* Left column — lease list */}
        <aside
          className={`w-full lg:w-[min(100%,320px)] lg:flex-shrink-0 flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden ${
            routeLeaseId ? 'max-lg:hidden' : ''
          }`}
        >
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Leases</h2>
            {isLg ? (
              <button
                type="button"
                onClick={handleNew}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + New
              </button>
            ) : (
              <Link
                href={`${LEASE_MINDER_PATH}/new`}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + New
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[60vh] lg:max-h-none">
            {loading ? (
              <p className="p-4 text-sm text-gray-500">Loading leases…</p>
            ) : leases.length === 0 ? (
              <p className="p-4 text-sm text-gray-600 dark:text-gray-400">
                No leases yet. Choose <span className="font-medium text-indigo-600 dark:text-indigo-400">New</span>, fill
                the form on the right, and save.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-700">
                {leases.map((row) => {
                  const rowActive = isLg ? row.id === selectedId : routeLeaseId === row.id
                  const rowClasses = `w-full text-left px-4 py-3 transition-colors flex items-center gap-3 min-w-0 ${
                    rowActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                      : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent'
                  }`
                  return (
                    <li key={row.id}>
                      {isLg ? (
                        <button type="button" onClick={() => selectLease(row)} className={rowClasses}>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-gray-900 dark:text-white">{row.vehicle_name}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Started {row.lease_start_date} · {row.lease_period_months} mo
                            </span>
                          </span>
                        </button>
                      ) : (
                        <Link href={`${LEASE_MINDER_PATH}/${row.id}`} className={rowClasses}>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-gray-900 dark:text-white">{row.vehicle_name}</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              Started {row.lease_start_date} · {row.lease_period_months} mo
                            </span>
                          </span>
                          <svg
                            className="h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Right column — detail & projection */}
        <section
          className={`flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm p-5 sm:p-6 ${
            !routeLeaseId ? 'max-lg:hidden' : ''
          }`}
        >
          {routeLeaseId && (
            <div className="mb-4 lg:hidden">
              <Link
                href={LEASE_MINDER_PATH}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to leases
              </Link>
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {selectedId ? 'Lease details' : 'New lease'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {selectedId
              ? 'Log your latest odometer and review pace and projected overage first. Lease contract fields are below if you need to change them.'
              : 'Enter the vehicle and lease terms, then save. After the lease exists, you can track odometer readings and mileage projections here.'}
          </p>

          {selectedId && (
            <div className="mb-8 min-w-0 pb-8 border-b border-gray-200 dark:border-slate-700">
              <label className="block w-full min-w-0 max-w-full sm:max-w-xs">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Current odometer</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full min-w-0 max-w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 selection:bg-indigo-100 dark:selection:bg-indigo-900/60"
                  value={currentOdoDraft}
                  onChange={(e) => setCurrentOdoDraft(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => {
                    void persistCurrentOdometer()
                  }}
                  placeholder="e.g. 28420"
                  disabled={odometerSaving}
                />
                {savedCurrentOdo != null && String(savedCurrentOdo).trim() !== '' && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500/90">
                    {Number(savedCurrentOdo).toLocaleString()} mi
                    {formatReadingAge(savedCurrentOdoAt) ? (
                      <>
                        {' '}
                        · <span className="italic">{formatReadingAge(savedCurrentOdoAt)}</span>
                      </>
                    ) : savedCurrentOdoAt == null ? (
                      <>
                        {' '}
                        · <span className="italic">recorded (date not stored)</span>
                      </>
                    ) : null}
                    {odometerSaving ? <span className="ml-2 text-gray-400">Saving…</span> : null}
                  </p>
                )}
                {(!savedCurrentOdo || String(savedCurrentOdo).trim() === '') && (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-500/80">
                    No saved reading yet. Tab out or click away after entering miles to save.
                  </p>
                )}
              </label>

              {form.leaseStartDate && form.leasePeriodMonths && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Approx. last lease day: <strong>{formatShortDate(lastDay)}</strong>
                </p>
              )}

              {projection && (
                <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 px-3 py-2">
                    <dt className="text-gray-500 dark:text-gray-400">Days into lease / total</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {projection.elapsedDays} / {projection.totalLeaseDays}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 px-3 py-2">
                    <dt className="text-gray-500 dark:text-gray-400">Miles driven so far</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {projection.milesDriven.toLocaleString()} mi
                    </dd>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 px-3 py-2">
                    <dt className="text-gray-500 dark:text-gray-400">Pro-rated &ldquo;allowed&rdquo; odometer now</dt>
                    <dd className="font-medium text-gray-900 dark:text-white">
                      {Math.round(projection.proRatedAllowedNow).toLocaleString()} mi
                    </dd>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-900/60 px-3 py-2">
                    <dt className="text-gray-500 dark:text-gray-400">Ahead / behind pace</dt>
                    <dd
                      className={`font-medium ${
                        projection.milesAheadOfPace > 0
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {projection.milesAheadOfPace > 0 ? '+' : ''}
                      {Math.round(projection.milesAheadOfPace).toLocaleString()} mi
                    </dd>
                  </div>
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 sm:col-span-2 border border-indigo-100 dark:border-indigo-900/50">
                    <dt className="text-indigo-800 dark:text-indigo-300">Projected odometer at lease end</dt>
                    <dd className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
                      {projection.projectedEndOdometer != null
                        ? `${Math.round(projection.projectedEndOdometer).toLocaleString()} mi`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 border border-indigo-100 dark:border-indigo-900/50">
                    <dt className="text-indigo-800 dark:text-indigo-300">Projected over miles</dt>
                    <dd className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
                      {projection.projectedOverMiles != null
                        ? `${Math.round(projection.projectedOverMiles).toLocaleString()} mi`
                        : '—'}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 border border-indigo-100 dark:border-indigo-900/50">
                    <dt className="text-indigo-800 dark:text-indigo-300">Projected overage cost</dt>
                    <dd className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
                      {projection.projectedOverageCost != null ? formatMoney(projection.projectedOverageCost) : '—'}
                    </dd>
                  </div>
                </dl>
              )}

              {projection?.trendNote && (
                <p className="mt-4 text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2">
                  {projection.trendNote}
                </p>
              )}
            </div>
          )}

          <h3
            id="lease-minder-contract-heading"
            className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3"
          >
            {selectedId ? 'Lease contract & allowance' : 'Vehicle & lease terms'}
          </h3>

          <fieldset
            aria-labelledby="lease-minder-contract-heading"
            className="min-w-0 grid grid-cols-[minmax(0,1fr)] gap-4 border-0 p-0 m-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Vehicle name</span>
              <input
                className="mt-1 w-full min-w-0 max-w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.vehicleName}
                onChange={(e) => updateField('vehicleName', e.target.value)}
                placeholder="e.g. 2024 Outback"
              />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Lease start date</span>
              <input
                type="date"
                className="lease-minder-date-field mt-1 w-full min-w-0 max-w-full cursor-pointer rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.leaseStartDate}
                onChange={(e) => updateField('leaseStartDate', e.target.value)}
              />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Lease period (months)</span>
              <input
                type="number"
                min={1}
                max={120}
                className="mt-1 w-full min-w-0 max-w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.leasePeriodMonths}
                onChange={(e) => updateField('leasePeriodMonths', e.target.value)}
              />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Initial odometer (at lease start)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full min-w-0 max-w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.initialOdometer}
                onChange={(e) => updateField('initialOdometer', e.target.value)}
              />
            </label>

            <fieldset className="min-w-0 sm:col-span-2 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
              <legend className="text-xs font-semibold text-gray-700 dark:text-gray-200 px-1">Allocated miles</legend>
              <div className="flex flex-wrap gap-4 mt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaseMinder-allocation-mode"
                    value="total"
                    checked={form.allocationMode === 'total'}
                    onChange={() => updateField('allocationMode', 'total')}
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">Total miles for entire lease</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="leaseMinder-allocation-mode"
                    value="annual"
                    checked={form.allocationMode === 'annual'}
                    onChange={() => updateField('allocationMode', 'annual')}
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">Annual miles (cap is prorated)</span>
                </label>
              </div>
              {form.allocationMode === 'annual' ? (
                <label className="block min-w-0 mt-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Miles per year</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full min-w-0 max-w-full sm:max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    value={form.annualMiles}
                    onChange={(e) => updateField('annualMiles', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Stored total cap:{' '}
                    <strong>{form.totalAllocatedMiles || '—'}</strong> mi (rounded from annual × lease months ÷ 12)
                  </p>
                </label>
              ) : (
                <label className="block min-w-0 mt-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Total allocated miles</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full min-w-0 max-w-full sm:max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    value={form.totalAllocatedMiles}
                    onChange={(e) => updateField('totalAllocatedMiles', e.target.value)}
                  />
                </label>
              )}
            </fieldset>

            <label className="block min-w-0 sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Overage cost per mile ($)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full min-w-0 max-w-full sm:max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.overageCostPerMile}
                onChange={(e) => updateField('overageCostPerMile', e.target.value)}
              />
            </label>
          </fieldset>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving || !isLeaseFormDirty}
              onClick={handleSave}
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : selectedId ? 'Save changes' : 'Save lease'}
            </button>
            {selectedId && (
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="inline-flex items-center justify-center rounded-lg border border-red-300 dark:border-red-800 px-5 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
