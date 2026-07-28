import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import { PageHeader, Panel, SectionTitle } from '@/apps/deadpool/components/ui'

export const metadata = {
  title: 'Dead Pool — Rules',
  robots: 'noindex, nofollow',
}

function Rule({ title, children }) {
  return (
    <Panel className="p-5">
      <SectionTitle className="mb-3">{title}</SectionTitle>
      <div className="space-y-2 text-sm leading-relaxed text-gray-300">{children}</div>
    </Panel>
  )
}

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-black text-gray-100">
      <DeadpoolNav />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader title="Rules" subtitle="Read before you enter. The commissioner is watching." />

        <div className="space-y-4">
          <Rule title="Season">
            <p>
              The season runs January 1 through December 31. You can submit and edit your list of picks
              as often as you like until{' '}
              <span className="font-semibold text-white">11:59pm Mountain Standard Time</span> on
              December 31 — after that, lists lock for the year.
            </p>
          </Rule>

          <Rule title="Picks">
            <p>
              Each participant submits up to{' '}
              <span className="font-semibold text-white">20 names</span> of people they predict will die
              during the season.
            </p>
          </Rule>

          <Rule title="Scoring">
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

          <Rule title="List privacy">
            <p>
              Your list is private while you&apos;re still building it — no one else can see it, and you
              can&apos;t see theirs. Once the season starts on January 1, every participant&apos;s picks
              become visible to every other participant.
            </p>
          </Rule>

          <Rule title="Submitting a death">
            <p>
              Spot a death that should count? Submit a tip and the admin will review it and record it if
              confirmed.
            </p>
          </Rule>

          <Rule title="Winner">
            <p>
              The winner is whoever has the highest point total as of midnight Mountain Standard Time on
              January 1, 2028. The Flaming Red Head has agreed to hold off declaring a winner for a few
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

          <Rule title="Disputes">
            <p>
              The Flaming Red Head&apos;s sole representative,{' '}
              <a
                href="mailto:admin@kleimeyer.com"
                className="text-red-400 underline hover:text-red-300"
              >
                admin@kleimeyer.com
              </a>
              , is the final arbiter of the FRHDP&apos;s outcome. This is a friendly game, so if anyone
              disputes the result, they&apos;ll receive a cheerful refund — deducted from the
              winner&apos;s prize money. They&apos;ll also be publicly named on the site and barred from
              any future Dead Pool participation.
            </p>
            <p>
              Disputes must be received by email to the administrator,{' '}
              <a
                href="mailto:admin@kleimeyer.com"
                className="text-red-400 underline hover:text-red-300"
              >
                admin@kleimeyer.com
              </a>
              , before midnight Mountain Standard Time on January 5, 2028. Announcement of the winner
              may be postponed while a dispute is being investigated.
            </p>
          </Rule>
        </div>
      </div>
    </div>
  )
}
