/**
 * Lease end as the first calendar day *after* the contracted term (exclusive bound).
 * @param {string} leaseStartYmd - YYYY-MM-DD
 * @param {number} periodMonths
 * @returns {Date}
 */
export function leaseEndExclusive(leaseStartYmd, periodMonths) {
  const [y, m, d] = leaseStartYmd.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const end = new Date(start)
  end.setMonth(end.getMonth() + periodMonths)
  return end
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Whole days strictly after `start` and strictly before `endExclusive`. */
function daysAfterStartUntilExclusiveEnd(start, endExclusive) {
  const a = startOfLocalDay(start).getTime()
  const b = startOfLocalDay(endExclusive).getTime()
  return Math.max(0, Math.round((b - a) / 86400000))
}

/** Inclusive calendar days from lease start through `asOf` (0 on first day of lease). */
function elapsedLeaseDaysInclusive(start, asOf, totalLeaseDays) {
  const raw = Math.floor(
    (startOfLocalDay(asOf).getTime() - startOfLocalDay(start).getTime()) / 86400000
  )
  const clamped = Math.max(0, raw)
  return Math.min(totalLeaseDays, clamped)
}

/**
 * @param {object} p
 * @param {string} p.leaseStartYmd
 * @param {number} p.leasePeriodMonths
 * @param {number} p.initialOdometer
 * @param {number} p.totalAllocatedMiles
 * @param {number} p.currentOdometer
 * @param {number} p.overageCostPerMile
 * @param {Date} [p.asOf]
 */
export function computeLeaseProjection({
  leaseStartYmd,
  leasePeriodMonths,
  initialOdometer,
  totalAllocatedMiles,
  currentOdometer,
  overageCostPerMile,
  asOf = new Date(),
}) {
  const [y, m, d] = leaseStartYmd.split('-').map(Number)
  const start = new Date(y, m - 1, d)
  const endEx = leaseEndExclusive(leaseStartYmd, leasePeriodMonths)
  const totalLeaseDays = Math.max(1, daysAfterStartUntilExclusiveEnd(start, endEx))

  const elapsedDays = elapsedLeaseDaysInclusive(start, asOf, totalLeaseDays)

  const milesDriven = currentOdometer - initialOdometer
  const allowedOdometerAtEnd = initialOdometer + totalAllocatedMiles
  const proRatedAllowedNow =
    initialOdometer + (totalAllocatedMiles * elapsedDays) / totalLeaseDays
  const milesAheadOfPace = currentOdometer - proRatedAllowedNow

  let projectedEndOdometer = null
  let projectedOverMiles = null
  let projectedOverageCost = null
  let trendNote = null

  if (elapsedDays <= 0) {
    trendNote =
      'Projection needs at least one full day after the lease start date (or enter a current odometer after the first day).'
  } else if (milesDriven < 0) {
    trendNote = 'Current odometer is below the initial reading — check your numbers.'
  } else {
    projectedEndOdometer = initialOdometer + (milesDriven / elapsedDays) * totalLeaseDays
    projectedOverMiles = Math.max(0, projectedEndOdometer - allowedOdometerAtEnd)
    projectedOverageCost = projectedOverMiles * Number(overageCostPerMile)
  }

  const remainingDays = Math.max(0, totalLeaseDays - elapsedDays)

  return {
    leaseEndExclusive: endEx,
    totalLeaseDays,
    elapsedDays,
    remainingDays,
    milesDriven,
    allowedOdometerAtEnd,
    proRatedAllowedNow,
    milesAheadOfPace,
    projectedEndOdometer,
    projectedOverMiles,
    projectedOverageCost,
    trendNote,
  }
}

export function totalMilesFromAnnual(annualMiles, leasePeriodMonths) {
  return Math.round((annualMiles * leasePeriodMonths) / 12)
}
