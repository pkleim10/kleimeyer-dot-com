import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import { PageHeader, Panel, SectionTitle } from '@/apps/deadpool/components/ui'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'

export const metadata = {
  title: 'Dead Pool — Rules',
  robots: 'noindex, nofollow',
}

function Rule({ title, children, id }) {
  return (
    <Panel id={id} className="p-5">
      <SectionTitle className="mb-3">{title}</SectionTitle>
      <div className="space-y-2 text-sm leading-relaxed text-gray-300">{children}</div>
    </Panel>
  )
}

function Step({ n, title, children }) {
  return (
    <li className="flex gap-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-800/70 font-display text-xs text-red-400">
        {n}
      </span>
      <div className="space-y-2">
        <p className="font-display text-sm uppercase tracking-[0.14em] text-white">{title}</p>
        <div className="space-y-2 text-sm leading-relaxed text-gray-300">{children}</div>
      </div>
    </li>
  )
}

export default async function RulesPage() {
  const seasonYear = await getSelectedSeasonYear()
  const nextYear = seasonYear + 1

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Rules" subtitle="Read before you enter." />

        <div className="space-y-4">
          <Panel className="p-5">
            <SectionTitle className="mb-4">How to enter — the three steps</SectionTitle>
            <div className="mb-5 space-y-3 text-sm leading-relaxed text-gray-300">
              <p>
                Dead Pool lists should stay secret until they can be revealed to every player at the
                same time. That stops anyone from peeking at other players&apos; lists before January
                1 — and from copying picks for the{' '}
                <a href="#scoring" className="text-red-500 underline hover:text-red-400">
                  uniqueness bonus
                </a>
                . To keep that fair, the site uses a silent-bid process: think of it like sealing a
                letter. You write your list at home. Before the season starts you leave a wax seal on
                the site — proof you locked your list in, without showing anyone what&apos;s inside.
                Even The Commissioner cannot see anyone&apos;s lists before the other players can.
              </p>
              <p>
                After January 1 you open the letter: paste the same list again. The site checks it
                against your seal on the{' '}
                <span className="font-semibold text-white">Sealed Lists</span> page. If it matches,
                you&apos;re in.
              </p>
            </div>
            <ol className="space-y-5">
              <Step n="1" title="Write your list">
                <p>
                  Up to <span className="font-semibold text-white">20 names</span> of people you
                  predict will die during the season. Keep it in your own file — a note, a document,
                  a scrap of paper — together with a{' '}
                  <span className="font-semibold text-white">secret word</span> you make up.
                </p>
                <p>
                  The site will never store this list for you before the {seasonYear} season starts, so keep
                  it somewhere you won&apos;t lose it.
                </p>
              </Step>

              <Step n="2" title="Seal it before the deadline">
                <p>
                  Paste your list and your secret word into the{' '}
                  <span className="font-semibold text-white">My Picks</span> page and seal it, any time between now and{' '}
                  <span className="font-semibold text-white">
                    11:59pm Mountain Standard Time on December 31
                  </span>{' '}
                  — the night before the season starts.
                </p>
                <p>
                  Only a <span className="font-semibold text-white">fingerprint</span> of your list is
                  uploaded — a short code that reveals nothing about the names behind it. You can
                  check this yourself: open your browser&apos;s developer tools and watch what
                  actually gets sent.
                </p>
                <p>
                  Re-submit as often as you like before the deadline. Different names, different secret,
                  it doesn&apos;t matter. Changing your mind is free, and a fingerprint gives nothing
                  away.
                </p>
              </Step>

              <Step n="3" title="Submit again after January 1">
                <p>
                  <span className="font-semibold text-white">
                    You must come back after the season opens and paste the same list and secret word
                    again.
                  </span>{' '}
                  They&apos;re checked against the fingerprint you sealed. If they match, your list is
                  entered and becomes public.
                </p>
                <p>
                  This step is not optional. A sealed fingerprint on its own is{' '}
                  <span className="font-semibold text-white">not</span> an entry — if you never post
                  your list, you are not in the pool, and because the site never had a copy, nobody
                  can recover it for you.
                </p>
              </Step>
            </ol>
            <p className="mt-5 text-sm leading-relaxed text-gray-400">
              It sounds a little more complicated than it is. Don&apos;t worry — follow the three steps
              and you&apos;ll be fine.
            </p>
          </Panel>

          <Rule title="The Kobayashi Maru">
            <p>
              The Flaming Red Head stands behind the silent-bid seal and calls it unbeatable. You are
              welcome to prove him wrong — peek, forge, tamper, or break it any way you like. There is
              no penalty for trying. That is how sure he is that you will fail. He laughs in Hell at
              your pathetic attempts.
            </p>
          </Rule>

          <Rule title="Season">
            <p>
              The season runs January 1 through December 31. Sealing closes at{' '}
              <span className="font-semibold text-white">
                11:59pm Mountain Standard Time on December 31, the night before the season starts
              </span>
              . After that no list can be sealed or changed, and each list becomes public as its owner
              posts it.
            </p>
          </Rule>

          <Rule id="scoring" title="Scoring">
            <p>
              When someone on your list dies, you earn{' '}
              <span className="font-semibold text-white">100 minus their age</span> at death. Younger
              deaths are worth more — and yes, a death past age 100 can score negative points.
            </p>
            <p>
              If you were the <span className="font-semibold text-white">only</span> participant who
              picked that person, you also get a flat{' '}
              <span className="font-semibold text-white">+25 uniqueness bonus</span>.
            </p>
          </Rule>

          <Rule title="Winner">
            <p>
              The winner is whoever has the highest point total as of midnight Mountain Standard Time on
              January 1, {nextYear}. The Flaming Red Head has agreed to hold off declaring a winner for a few
              days after that, to allow for last-minute submissions — though the death itself must have
              occurred before the deadline above to count.
            </p>
            <p>
              <span className="font-semibold text-white">Important:</span> once a winner is declared and
              prize money is awarded, there are no take-backs — even if an unreported death later
              surfaces that would have changed the outcome. In case of a tie, the pot is split evenly
              among the winners.
            </p>
          </Rule>

          <Rule title="Submitting a death">
            <p>
              Spot a death that should count? Submit a tip and The Commissioner will review it and record it if
              confirmed.
            </p>
          </Rule>

          <Rule title="Disputes">
            <p>
              The Flaming Red Head&apos;s sole representative,{' '}
              <a
                href="mailto:admin@kleimeyer.com"
                className="text-red-400 underline hover:text-red-300"
              >
                The Commissioner
              </a>
              , is the final arbiter of the FRHDP&apos;s outcome. This is a friendly game, so if anyone
              disputes the result, they&apos;ll receive a cheerful refund — deducted from the
              winner&apos;s prize money. They&apos;ll also be publicly named on the site and barred from
              any future Dead Pool participation.
            </p>
            <p>
              Disputes must be received by email to{' '}
              <a
                href="mailto:admin@kleimeyer.com"
                className="text-red-400 underline hover:text-red-300"
              >
                The Commissioner
              </a>
              , before midnight Mountain Standard Time on January 5, {nextYear}. Announcement of the winner
              may be postponed while a dispute is being investigated.
            </p>
          </Rule>
        </div>
      </div>
    </div>
  )
}
