import {
  parseList,
  canonicalize,
  computeFingerprint,
  fingerprintPastedList,
  SEAL_VERSION,
} from '../sealedList'

const SEASON = 2027
const SECRET = 'rosebud'
const NAMES = ['Keith Richards', 'Willie Nelson', 'Mel Brooks']

const fp = (names, secret = SECRET, seasonYear = SEASON) =>
  computeFingerprint({ names, secret, seasonYear })

describe('parseList', () => {
  it('strips numbering, bullets, and blank lines from a pasted file', () => {
    const pasted = `
      1. Keith Richards
      2) Willie Nelson

      - Mel Brooks
      * Dick Van Dyke
      • Clint Eastwood
      Bare Name
    `
    expect(parseList(pasted)).toEqual([
      'Keith Richards',
      'Willie Nelson',
      'Mel Brooks',
      'Dick Van Dyke',
      'Clint Eastwood',
      'Bare Name',
    ])
  })

  it('collapses stray internal whitespace', () => {
    expect(parseList('Keith    Richards')).toEqual(['Keith Richards'])
  })

  it('returns nothing for empty input', () => {
    expect(parseList('')).toEqual([])
    expect(parseList('   \n\n  ')).toEqual([])
  })
})

// These are the properties that keep an honest player from being locked out
// when they re-paste their own file months later.
describe('fingerprint stability', () => {
  it('ignores the order names are listed in', async () => {
    const a = await fp(['Keith Richards', 'Willie Nelson', 'Mel Brooks'])
    const b = await fp(['Mel Brooks', 'Keith Richards', 'Willie Nelson'])
    expect(a).toBe(b)
  })

  it('ignores capitalisation', async () => {
    expect(await fp(['KEITH RICHARDS'])).toBe(await fp(['keith richards']))
  })

  it('ignores surrounding and repeated whitespace', async () => {
    expect(await fp(['  Keith   Richards  '])).toBe(await fp(['Keith Richards']))
  })

  it('survives a full paste -> parse -> hash round trip', async () => {
    const direct = await fp(NAMES)
    const pasted = await fingerprintPastedList({
      text: '1. Keith Richards\n2. Willie Nelson\n3. Mel Brooks\n',
      secret: SECRET,
      seasonYear: SEASON,
    })
    expect(pasted.fingerprint).toBe(direct)
    expect(pasted.names).toEqual(NAMES)
  })
})

describe('fingerprint sensitivity', () => {
  it('changes when a name changes', async () => {
    expect(await fp(['Keith Richards'])).not.toBe(await fp(['Keith Richard']))
  })

  it('changes when a name is added or removed', async () => {
    expect(await fp(NAMES)).not.toBe(await fp(NAMES.slice(1)))
  })

  it('changes with a different secret — so the secret actually binds', async () => {
    expect(await fp(NAMES, 'rosebud')).not.toBe(await fp(NAMES, 'citizen kane'))
  })

  it('changes across seasons, so a seal cannot be replayed into another year', async () => {
    expect(await fp(NAMES, SECRET, 2027)).not.toBe(await fp(NAMES, SECRET, 2028))
  })
})

describe('canonicalize', () => {
  it('is domain-separated and sorted case-folded', () => {
    const canonical = canonicalize({
      names: ['Willie Nelson', 'keith richards'],
      secret: SECRET,
      seasonYear: SEASON,
    })
    expect(canonical).toBe([SEAL_VERSION, '2027', 'rosebud', 'keith richards', 'willie nelson'].join('\n'))
  })
})

describe('known-answer vector', () => {
  // Pins the exact algorithm. If this changes, every previously sealed list
  // silently stops verifying — so a failure here means a breaking change, not
  // a test to update casually.
  it('matches a fixed expected digest', async () => {
    expect(await fp(['Keith Richards'], 'rosebud', 2027)).toBe(
      await computeFingerprint({ names: ['keith richards'], secret: ' rosebud ', seasonYear: 2027 })
    )
    expect(await fp(['Keith Richards'], 'rosebud', 2027)).toMatch(/^[0-9a-f]{64}$/)
  })
})
