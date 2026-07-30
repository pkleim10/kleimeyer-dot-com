import {
  hasUnseenAnnouncements,
  mergeAnnouncementItems,
  revealAnnouncementCopy,
  sealAnnouncementCopy,
} from '../announcements'

const hit = (dateOfDeath, displayName) => ({ id: `h-${displayName}`, displayName, dateOfDeath })
const notice = (createdAt, title) => ({ id: `n-${title}`, title, body: 'body', created_at: createdAt })

describe('sealAnnouncementCopy', () => {
  it('announces a first seal by team name', () => {
    expect(sealAnnouncementCopy({ displayName: 'The Flaming Skulls', resealed: false })).toEqual({
      title: 'List sealed',
      body: 'The Flaming Skulls sealed their list. The fingerprint is now on the Sealed Lists page.',
    })
  })

  it('announces a re-seal distinctly', () => {
    const copy = sealAnnouncementCopy({ displayName: 'The Flaming Skulls', resealed: true })
    expect(copy.title).toBe('List re-sealed')
    expect(copy.body).toMatch(/re-sealed/)
    expect(copy.body).toMatch(/superseded/)
  })

  it('falls back when the display name is missing', () => {
    expect(sealAnnouncementCopy({ displayName: '', resealed: false }).body).toMatch(/^A team sealed/)
  })
})

describe('revealAnnouncementCopy', () => {
  it('announces a final posting by team name', () => {
    expect(revealAnnouncementCopy({ displayName: 'The Flaming Skulls' })).toEqual({
      title: 'List posted',
      body: "The Flaming Skulls posted their sealed list. It is now on Everyone's Lists.",
    })
  })

  it('falls back when the display name is missing', () => {
    expect(revealAnnouncementCopy({ displayName: '' }).body).toMatch(/^A team posted/)
  })
})

describe('hasUnseenAnnouncements', () => {
  it('is false when nothing has been posted', () => {
    expect(hasUnseenAnnouncements(null, null)).toBe(false)
    expect(hasUnseenAnnouncements(null, '2027-01-01T00:00:00Z')).toBe(false)
  })

  it('is true when the player has never viewed the feed', () => {
    expect(hasUnseenAnnouncements('2027-03-01T12:00:00Z', null)).toBe(true)
  })

  it('is true only when something newer than the last view exists', () => {
    expect(hasUnseenAnnouncements('2027-03-02T00:00:00Z', '2027-03-01T00:00:00Z')).toBe(true)
    expect(hasUnseenAnnouncements('2027-03-01T00:00:00Z', '2027-03-01T00:00:00Z')).toBe(false)
    expect(hasUnseenAnnouncements('2027-02-28T00:00:00Z', '2027-03-01T00:00:00Z')).toBe(false)
  })
})

describe('mergeAnnouncementItems', () => {
  it('tags each item with its kind', () => {
    const merged = mergeAnnouncementItems([hit('2027-03-01', 'A')], [notice('2027-04-01T10:00:00Z', 'N')])
    expect(merged.map((i) => i.kind)).toEqual(['notice', 'death'])
  })

  it('interleaves both kinds newest-first', () => {
    const merged = mergeAnnouncementItems(
      [hit('2027-01-15', 'Jan'), hit('2027-06-15', 'Jun')],
      [notice('2027-03-20T12:00:00Z', 'Mar'), notice('2027-09-20T12:00:00Z', 'Sep')]
    )
    expect(merged.map((i) => i.title ?? i.displayName)).toEqual(['Sep', 'Jun', 'Mar', 'Jan'])
  })

  it('exposes a notice body and posted date', () => {
    const [item] = mergeAnnouncementItems([], [notice('2027-05-05T08:30:00Z', 'Heads up')])
    expect(item).toMatchObject({ kind: 'notice', title: 'Heads up', body: 'body' })
    expect(item.postedAt).toBe('2027-05-05T08:30:00Z')
  })

  it('preserves the original hit fields it was given', () => {
    const source = { ...hit('2027-02-02', 'Someone'), totalPoints: 42, pickedBy: ['Team'] }
    const [item] = mergeAnnouncementItems([source], [])
    expect(item).toMatchObject({ kind: 'death', totalPoints: 42, pickedBy: ['Team'] })
  })

  it('handles either side being empty', () => {
    expect(mergeAnnouncementItems([], [])).toEqual([])
    expect(mergeAnnouncementItems([hit('2027-01-01', 'Only')], [])).toHaveLength(1)
    expect(mergeAnnouncementItems([], [notice('2027-01-01T00:00:00Z', 'Only')])).toHaveLength(1)
  })
})
