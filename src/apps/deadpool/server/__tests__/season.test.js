import { getPickDeadline, isPicksEditable, getSessionExpiry, hasSeasonStarted } from '../season'

describe('getPickDeadline', () => {
  it('is 11:59:59pm MST (UTC-7) on Dec 31 of the given season', () => {
    const deadline = getPickDeadline(2026)
    expect(deadline.toISOString()).toBe('2027-01-01T06:59:59.000Z')
  })
})

describe('isPicksEditable', () => {
  it('is true before the deadline', () => {
    expect(isPicksEditable(2026, new Date('2026-06-01T00:00:00Z'))).toBe(true)
  })

  it('is true at the exact deadline', () => {
    expect(isPicksEditable(2026, new Date('2027-01-01T06:59:59.000Z'))).toBe(true)
  })

  it('is false after the deadline', () => {
    expect(isPicksEditable(2026, new Date('2027-01-01T07:00:00Z'))).toBe(false)
  })
})

describe('hasSeasonStarted', () => {
  it('is false before Jan 1 of the season', () => {
    expect(hasSeasonStarted(2026, new Date('2025-12-31T23:59:59.000Z'))).toBe(false)
  })

  it('is true at the exact start of the season', () => {
    expect(hasSeasonStarted(2026, new Date('2026-01-01T00:00:00.000Z'))).toBe(true)
  })

  it('is true well into the season', () => {
    expect(hasSeasonStarted(2026, new Date('2026-06-01T00:00:00Z'))).toBe(true)
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
