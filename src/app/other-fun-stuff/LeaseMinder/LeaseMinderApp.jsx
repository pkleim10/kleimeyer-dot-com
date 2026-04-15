'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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

export default function LeaseMinderApp() {
  const { user, loading: authLoading } = useAuth()
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [currentOdometerByLease, setCurrentOdometerByLease] = useState({})

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
      if (typeof window !== 'undefined' && user?.id) {
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
  }

  const currentOdoInput = selectedId ? currentOdometerByLease[selectedId] ?? '' : ''

  const projection = useMemo(() => {
    if (!selected || currentOdoInput === '' || currentOdoInput == null) return null
    const current = Number(String(currentOdoInput).replace(/,/g, ''))
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
  }, [selected, currentOdoInput, form])

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
    if (!form.leaseStartDate) throw new Error('Lease start date is required.')
    if (!Number.isFinite(months) || months < 1) throw new Error('Lease period (months) must be at least 1.')
    if (!Number.isFinite(initial) || initial < 0) throw new Error('Initial odometer must be zero or positive.')
    if (!Number.isFinite(overage) || overage < 0) throw new Error('Overage cost per mile must be zero or positive.')

    return {
      vehicle_name: form.vehicleName.trim(),
      lease_start_date: form.leaseStartDate,
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
    setCurrentOdometerByLease((m) => {
      const { [selectedId]: _, ...rest } = m
      return rest
    })
  }

  const handleNew = () => {
    try {
      if (typeof window !== 'undefined' && user?.id) {
        sessionStorage.removeItem(leaseMinderSelectedStorageKey(user.id))
      }
    } catch (_) {
      /* ignore */
    }
    setSelectedId(null)
    setForm(emptyForm())
  }

  const afterSaveSelect = (row) => {
    setSelectedId(row.id)
    setForm(rowToForm(row))
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
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[480px]">
        {/* Left column — lease list */}
        <aside className="w-full lg:w-[min(100%,320px)] lg:flex-shrink-0 flex flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Leases</h2>
            <button
              type="button"
              onClick={handleNew}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + New
            </button>
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
                {leases.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectLease(row)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        row.id === selectedId
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent'
                      }`}
                    >
                      <span className="block font-medium text-gray-900 dark:text-white">{row.vehicle_name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Started {row.lease_start_date} · {row.lease_period_months} mo
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right column — detail & projection */}
        <section className="flex-1 min-w-0 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {selectedId ? 'Lease details' : 'New lease'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Save the contract numbers here, then enter a current odometer reading to see projected turn-in mileage and
            overage cost.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Vehicle name</span>
              <input
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.vehicleName}
                onChange={(e) => updateField('vehicleName', e.target.value)}
                placeholder="e.g. 2024 Outback"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Lease start date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.leaseStartDate}
                onChange={(e) => updateField('leaseStartDate', e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Lease period (months)</span>
              <input
                type="number"
                min={1}
                max={120}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.leasePeriodMonths}
                onChange={(e) => updateField('leasePeriodMonths', e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Initial odometer (at lease start)</span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.initialOdometer}
                onChange={(e) => updateField('initialOdometer', e.target.value)}
              />
            </label>

            <fieldset className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-slate-600 p-4">
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
                <label className="block mt-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Miles per year</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    value={form.annualMiles}
                    onChange={(e) => updateField('annualMiles', e.target.value)}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Stored total cap:{' '}
                    <strong>{form.totalAllocatedMiles || '—'}</strong> mi (rounded from annual × lease months ÷ 12)
                  </p>
                </label>
              ) : (
                <label className="block mt-3">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Total allocated miles</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                    value={form.totalAllocatedMiles}
                    onChange={(e) => updateField('totalAllocatedMiles', e.target.value)}
                  />
                </label>
              )}
            </fieldset>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Overage cost per mile ($)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full max-w-xs rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                value={form.overageCostPerMile}
                onChange={(e) => updateField('overageCostPerMile', e.target.value)}
              />
            </label>
          </div>

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

          {selectedId && (
            <div className="mt-10 pt-8 border-t border-gray-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Current odometer & projection</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Linear trend from lease start through today — rough planning tool, not a substitute for your contract.
              </p>
              <label className="block max-w-xs">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Current odometer</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-white"
                  value={currentOdoInput}
                  onChange={(e) =>
                    setCurrentOdometerByLease((m) => ({ ...m, [selectedId]: e.target.value }))
                  }
                  placeholder="e.g. 28420"
                />
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
        </section>
      </div>
    </div>
  )
}
