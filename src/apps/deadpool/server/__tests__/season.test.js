import {
  getAvailableSeasonYears,
  getDefaultSeasonYear,
  getPickDeadline,
  getSeasonNow,
  getScheduledSeasonYear,
  isPicksEditable,
  getSessionExpiry,
  areListsPublic,
  getSeasonStart,
  resolveSelectedSeasonYear,
} from '../season'

const T_2027 = '2027-01-01T06:59:59.000Z' // 11:59:59pm MST, Dec 31 2026

describe('getSeasonNow', () => {
  it('returns a real Date when DEADPOOL_NOW is unset', () => {
    const before = Date.now()
    const now = getSeasonNow({}).getTime()
    const after = Date.now()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThanOrEqual(after)
  })

  it('uses DEADPOOL_NOW when it is a valid ISO timestamp', () => {
    expect(getSeasonNow({ DEADPOOL_NOW: '2027-01-01T07:00:00.000Z' }).toISOString()).toBe(
      '2027-01-01T07:00:00.000Z'
    )
  })

  it('falls back to the real clock for blank or invalid overrides', () => {
    const before = Date.now()
    expect(getSeasonNow({ DEADPOOL_NOW: '' }).getTime()).toBeGreaterThanOrEqual(before)
    expect(getSeasonNow({ DEADPOOL_NOW: 'not-a-date' }).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('opens the season when DEADPOOL_NOW is after the lock', () => {
    const now = getSeasonNow({ DEADPOOL_NOW: '2027-01-01T07:00:00.000Z' })
    expect(areListsPublic(2027, now)).toBe(true)
    expect(isPicksEditable(2027, now)).toBe(false)
  })
})

describe('getScheduledSeasonYear', () => {
  it('stays on the calendar year before July', () => {
    expect(getScheduledSeasonYear(new Date('2026-06-30T23:59:59.000Z'))).toBe(2026)
    expect(getScheduledSeasonYear(new Date('2027-01-15T12:00:00.000Z'))).toBe(2027)
  })

  it('opens next year on July 1 UTC', () => {
    expect(getScheduledSeasonYear(new Date('2026-07-01T00:00:00.000Z'))).toBe(2027)
    expect(getScheduledSeasonYear(new Date('2027-12-31T12:00:00.000Z'))).toBe(2028)
  })
})

describe('getAvailableSeasonYears / getDefaultSeasonYear', () => {
  it('skips 2026 (no pool that year) and defaults to 2027 in H1 2026', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    expect(getAvailableSeasonYears(now)).toEqual([2027])
    expect(getDefaultSeasonYear(now)).toBe(2027)
  })

  it('offers only 2027 in H2 2026 (2026 excluded; next year open)', () => {
    const now = new Date('2026-07-01T00:00:00.000Z')
    expect(getAvailableSeasonYears(now)).toEqual([2027])
    expect(getDefaultSeasonYear(now)).toBe(2027)
  })

  it('adds next year from July 1 in a normal year without changing the default', () => {
    const now = new Date('2027-07-01T00:00:00.000Z')
    expect(getDefaultSeasonYear(now)).toBe(2027)
    expect(getAvailableSeasonYears(now)).toEqual([2027, 2028])
  })
})

describe('resolveSelectedSeasonYear', () => {
  const july2026 = new Date('2026-07-15T00:00:00.000Z')
  const july2027 = new Date('2027-07-15T00:00:00.000Z')

  it('keeps a valid sticky selection', () => {
    expect(resolveSelectedSeasonYear('2027', july2026)).toBe(2027)
    expect(resolveSelectedSeasonYear(2028, july2027)).toBe(2028)
  })

  it('rejects 2026 and other stale values', () => {
    expect(resolveSelectedSeasonYear(2026, july2026)).toBe(2027)
    expect(resolveSelectedSeasonYear(undefined, july2026)).toBe(2027)
    expect(resolveSelectedSeasonYear('nope', july2027)).toBe(2027)
    expect(resolveSelectedSeasonYear('2025', july2027)).toBe(2027)
  })
})

describe('getPickDeadline', () => {
  it('locks the night before the season starts, not at its end', () => {
    // Regression: this used seasonYear + 1, putting the lock a full year late.
    expect(getPickDeadline(2027).toISOString()).toBe(T_2027)
  })
})

describe('isPicksEditable', () => {
  it('is true well before the deadline', () => {
    expect(isPicksEditable(2027, new Date('2026-06-01T00:00:00Z'))).toBe(true)
  })

  it('is true at the exact deadline', () => {
    expect(isPicksEditable(2027, new Date(T_2027))).toBe(true)
  })

  it('is false one second after the deadline', () => {
    expect(isPicksEditable(2027, new Date('2027-01-01T07:00:00Z'))).toBe(false)
  })
})

describe('areListsPublic', () => {
  it('is false while picks are still editable', () => {
    expect(areListsPublic(2027, new Date('2026-06-01T00:00:00Z'))).toBe(false)
  })

  it('is still false at the exact deadline, when picks are last editable', () => {
    expect(areListsPublic(2027, new Date(T_2027))).toBe(false)
  })

  it('is true one second later', () => {
    expect(areListsPublic(2027, new Date('2027-01-01T07:00:00Z'))).toBe(true)
  })

  // The property that matters: there must be no instant where a player can
  // read other lists and still edit their own, and no instant where lists are
  // both locked and hidden.
  it('is the exact complement of isPicksEditable across the boundary', () => {
    const instants = [
      '2026-12-31T00:00:00Z',
      '2027-01-01T06:59:58Z',
      T_2027,
      '2027-01-01T07:00:00Z',
      '2027-06-01T00:00:00Z',
    ]
    for (const iso of instants) {
      const now = new Date(iso)
      expect(areListsPublic(2027, now)).toBe(!isPicksEditable(2027, now))
    }
  })
})

describe('getSeasonStart', () => {
  // Kept calendar-based and distinct from the lock instant so a death dated
  // Jan 1 (a date-only value parsing as UTC midnight) still validates.
  it('is Jan 1 00:00 UTC, earlier in the day than the pick deadline', () => {
    expect(getSeasonStart(2027).toISOString()).toBe('2027-01-01T00:00:00.000Z')
    expect(getSeasonStart(2027).getTime()).toBeLessThan(getPickDeadline(2027).getTime())
  })
})

describe('getSessionExpiry', () => {
  it('is 400 days after the given time', () => {
    const now = new Date('2026-06-01T00:00:00.000Z')
    const expected = new Date(now.getTime() + 400 * 24 * 60 * 60 * 1000)
    expect(getSessionExpiry(now).toISOString()).toBe(expected.toISOString())
  })

  it('defaults to 400 days from now when called with no argument', () => {
    const before = Date.now()
    const expiry = getSessionExpiry().getTime()
    const after = Date.now()
    const days = 400 * 24 * 60 * 60 * 1000
    expect(expiry).toBeGreaterThanOrEqual(before + days)
    expect(expiry).toBeLessThanOrEqual(after + days)
  })
})
