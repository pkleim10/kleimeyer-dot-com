import Link from 'next/link'
import DeadpoolNav from '@/apps/deadpool/components/DeadpoolNav'
import SeasonPicker from '@/apps/deadpool/components/SeasonPicker'
import { Divider, Panel } from '@/apps/deadpool/components/ui'
import { getCurrentParticipant } from '@/apps/deadpool/server/session'
import { getSelectedSeasonYear } from '@/apps/deadpool/server/selectedSeason'
import {
  getAvailableSeasonYears,
  getScheduledSeasonYear,
  getSeasonNow,
} from '@/apps/deadpool/server/season'
import {
  getAnnouncementsSeenAt,
  getLatestAnnouncementPostedAt,
  hasUnseenAnnouncements,
} from '@/apps/deadpool/server/announcements'
import { buildRegistrationMailto } from '@/apps/deadpool/shared/registration'

export default async function DeadpoolPage() {
  const seasonYear = await getSelectedSeasonYear()
  const availableYears = getAvailableSeasonYears(getSeasonNow())
  const participant = await getCurrentParticipant()
  let showAnnouncementsLink = !participant

  if (participant) {
    try {
      const [latestAt, seenAt] = await Promise.all([
        getLatestAnnouncementPostedAt(seasonYear),
        getAnnouncementsSeenAt(participant.id),
      ])
      showAnnouncementsLink = hasUnseenAnnouncements(latestAt, seenAt)
    } catch (error) {
      console.error('Failed to check unseen announcements:', error)
      // Prefer showing the callout over silently hiding new notices.
      showAnnouncementsLink = true
    }
  }

  const nextSeasonYear = getScheduledSeasonYear(getSeasonNow())
  const registrationMailto = buildRegistrationMailto(nextSeasonYear)

  return (
    <div className="flex flex-col items-center text-gray-100">
      <DeadpoolNav />

      <div className="mx-auto flex w-full max-w-3xl items-start justify-between gap-4 px-4 pt-3">
        <div className="min-w-0 flex-1">
          {showAnnouncementsLink && (
            <Link
              href="/deadpool/announcements"
              className="inline-block font-display text-sm uppercase tracking-[0.14em] text-red-500 transition hover:text-red-400"
            >
              Latest Announcements →
            </Link>
          )}
        </div>
        <SeasonPicker seasonYear={seasonYear} availableYears={availableYears} />
      </div>

      {/* Heraldic crest: skull crowns the wordmark as one brand mark.
          Soft radial mask kills the video rectangle; modest negative margin
          lets lower flames kiss the top of "Flaming" without burying the type. */}
      <header className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-4 pb-4 pt-1">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[44%] h-[70%] w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(127,29,29,0.55)_0%,rgba(69,10,10,0.26)_44%,transparent_72%)] blur-3xl"
        />

        <div
          className="relative z-10 -mb-[5.5rem] w-[46%] max-w-[12.5rem] sm:-mb-[7rem] sm:max-w-[14.5rem] md:-mb-[8rem] md:max-w-[16rem]"
          style={{
            WebkitMaskImage:
              'radial-gradient(ellipse 78% 76% at 50% 46%, #000 46%, transparent 82%)',
            maskImage:
              'radial-gradient(ellipse 78% 76% at 50% 46%, #000 46%, transparent 82%)',
          }}
        >
          <video
            src="/deadpool/flamingredhead.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="block w-full"
          />
        </div>

        <div className="relative z-0 w-[94%] max-w-xl sm:max-w-2xl">
          <img
            src="/deadpool/flaming-logo.png"
            alt="Flaming Red Head"
            className="block w-full"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse closest-side, transparent 64%, #000 100%)',
            }}
          />
        </div>
      </header>

      <p className="px-4 pt-1 text-center font-display text-base uppercase tracking-[0.3em] text-white">
        Presents
      </p>
      <p className="px-4 text-center font-display text-2xl tracking-wide text-red-600 drop-shadow-[0_0_18px_rgba(220,38,38,0.45)] sm:text-[1.75rem]">
        DEAD POOL: Back from the dead
      </p>

      <Divider className="my-7 w-full max-w-2xl px-4" />

      <Panel className="mx-4 mb-10 max-w-2xl p-6">
        <p className="font-display text-[0.95rem] leading-[1.85] text-gray-200">
          Great news, everyone! The Flaming Red Head is back with an all-new reincarnation of The
          Flaming Red Head&apos;s Dead Pool. For the uninitiated: a dead pool is a game where players
          predict which well-known people will pass away in {seasonYear}. Sounds easy? It&apos;s harder
          than you think. The rules have been refined for {seasonYear}, so check out the{' '}
          <Link href="/deadpool/rules" className="text-red-500 hover:text-red-400 underline">
            Rules
          </Link>{' '}
          page before you enter — scoring now favors picks that aren&apos;t the obvious ones (nobody&apos;s impressed
          by &ldquo;really old person,&rdquo; for example). We don&apos;t wish death on anyone — we
          just want to profit from it — so request a registration code below, build your list before
          January 1, and have fun.
        </p>
        <a
          href={registrationMailto}
          className="mt-5 inline-block font-display text-sm uppercase tracking-[0.14em] text-red-500 transition hover:text-red-400"
        >
          Request a Registration Code →
        </a>
      </Panel>
    </div>
  )
}
