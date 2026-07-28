import {
  validateEmail,
  validateDisplayName,
  validatePickList,
  validateSubmission,
  validateHit,
  validateAnnouncement,
  MAX_PICKS,
  MAX_ANNOUNCEMENT_BODY,
} from '../validation'

describe('validateAnnouncement', () => {
  it('accepts a body-only notice and nulls the missing title', () => {
    expect(validateAnnouncement({ body: '  Picks close Friday.  ' })).toEqual({
      title: null,
      body: 'Picks close Friday.',
    })
  })

  it('keeps a provided title', () => {
    const result = validateAnnouncement({ title: '  Deadline moved  ', body: 'Details inside.' })
    expect(result).toEqual({ title: 'Deadline moved', body: 'Details inside.' })
  })

  it('rejects an empty or whitespace-only body', () => {
    expect(validateAnnouncement({ body: '   ' }).error).toBeTruthy()
    expect(validateAnnouncement({}).error).toBeTruthy()
  })

  it('rejects an over-long body', () => {
    expect(validateAnnouncement({ body: 'x'.repeat(MAX_ANNOUNCEMENT_BODY + 1) }).error).toBeTruthy()
  })
})

describe('validateEmail', () => {
  it('accepts a well-formed email and lowercases it', () => {
    expect(validateEmail(' Foo@Example.com ')).toEqual({ value: 'foo@example.com', isValid: true })
  })

  it('rejects a malformed email', () => {
    expect(validateEmail('not-an-email').isValid).toBe(false)
  })
})

describe('validateDisplayName', () => {
  it('trims and accepts a reasonable name', () => {
    expect(validateDisplayName('  Paul  ')).toEqual({ value: 'Paul', isValid: true })
  })

  it('rejects an empty name', () => {
    expect(validateDisplayName('   ').isValid).toBe(false)
  })

  it('rejects a name over 60 characters', () => {
    expect(validateDisplayName('x'.repeat(61)).isValid).toBe(false)
  })
})

describe('validatePickList', () => {
  it('trims, dedupes case-insensitively, and preserves order', () => {
    const result = validatePickList(['Bob Barker', ' bob barker ', 'Betty White'])
    expect(result.names).toEqual(['Bob Barker', 'Betty White'])
  })

  it('drops blank entries', () => {
    expect(validatePickList(['Bob Barker', '   ', '']).names).toEqual(['Bob Barker'])
  })

  it(`rejects more than ${MAX_PICKS} unique names`, () => {
    const names = Array.from({ length: MAX_PICKS + 1 }, (_, i) => `Person ${i}`)
    expect(validatePickList(names).error).toMatch(/at most/)
  })

  it('rejects a non-array payload', () => {
    expect(validatePickList('not an array').error).toBeTruthy()
  })

  it('rejects a single name over the length cap', () => {
    expect(validatePickList(['x'.repeat(101)]).error).toMatch(/too long/)
  })
})

describe('validateSubmission', () => {
  it('requires a name', () => {
    expect(validateSubmission({ name: '  ' }).error).toBeTruthy()
  })

  it('caps the note length', () => {
    const result = validateSubmission({ name: 'Someone', note: 'x'.repeat(600) })
    expect(result.note).toHaveLength(500)
  })
})

describe('validateHit', () => {
  it('accepts a valid hit and normalizes the date to YYYY-MM-DD', () => {
    const result = validateHit(2026, {
      displayName: 'Someone Famous',
      dateOfDeath: '2026-03-15',
      ageAtDeath: '84',
      announcementText: '  Rest in peace.  ',
    })
    expect(result).toEqual({
      displayName: 'Someone Famous',
      dateOfDeath: '2026-03-15',
      ageAtDeath: 84,
      announcementText: 'Rest in peace.',
    })
  })

  it('rejects a non-integer age', () => {
    expect(validateHit(2026, { displayName: 'X', dateOfDeath: '2026-01-01', ageAtDeath: 'old' }).error).toBeTruthy()
  })

  it('rejects an age outside 0-130', () => {
    expect(validateHit(2026, { displayName: 'X', dateOfDeath: '2026-01-01', ageAtDeath: 200 }).error).toBeTruthy()
  })

  it('rejects an invalid date', () => {
    expect(validateHit(2026, { displayName: 'X', dateOfDeath: 'not-a-date', ageAtDeath: 50 }).error).toBeTruthy()
  })

  it('rejects a date of death before the season starts', () => {
    const result = validateHit(2026, { displayName: 'X', dateOfDeath: '2025-12-31', ageAtDeath: 50 })
    expect(result.error).toBeTruthy()
  })

  it('accepts a date of death exactly at the season start', () => {
    const result = validateHit(2026, { displayName: 'X', dateOfDeath: '2026-01-01', ageAtDeath: 50 })
    expect(result.error).toBeUndefined()
  })
})
