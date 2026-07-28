import { EmptyState, formatDeathDate } from './ui.jsx'

function defaultAnnouncement(hit) {
  return `${hit.displayName} has died at age ${hit.ageAtDeath}.`
}

// Shared card chrome; the accent colour is what distinguishes a death notice
// (red) from a general commissioner notice (amber).
function Card({ accent, children }) {
  const tone =
    accent === 'death'
      ? 'border-l-red-700 from-red-950/25 shadow-[0_0_40px_-20px_rgba(220,38,38,0.5)]'
      : 'border-l-amber-600/80 from-amber-950/20 shadow-[0_0_40px_-20px_rgba(217,119,6,0.35)]'

  return (
    <article
      className={`relative overflow-hidden rounded-xl border border-zinc-800 border-l-2 bg-gradient-to-r to-zinc-950/80 p-5 ${tone}`}
    >
      {children}
    </article>
  )
}

function DeathNotice({ hit }) {
  return (
    <Card accent="death">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-xl tracking-wide text-red-500">{hit.displayName}</h3>
        <time className="font-display text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          {formatDeathDate(hit.dateOfDeath, { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
      </div>

      {/* The notice itself is the obituary — engraved small caps suit it,
          and these run a sentence or two, so legibility isn't a concern. */}
      <p className="mt-3 font-display text-[0.95rem] leading-[1.85] text-gray-300">
        {hit.announcementText || defaultAnnouncement(hit)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-zinc-800/80 pt-3 text-[11px] uppercase tracking-[0.14em]">
        <span className="text-zinc-500">Age {hit.ageAtDeath}</span>
        <span className="text-zinc-700" aria-hidden="true">
          &middot;
        </span>
        <span className="font-display text-sm normal-case tracking-normal text-red-400">
          {hit.totalPoints} pts
        </span>
        {hit.bonus > 0 && (
          <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
            +{hit.bonus} unique
          </span>
        )}
        {hit.pickedBy.length > 0 && (
          <span className="text-zinc-500">
            <span className="text-zinc-700">Called by </span>
            {/* Team names are proper nouns — don't force them uppercase. */}
            <span className="text-xs normal-case tracking-normal text-zinc-400">
              {hit.pickedBy.join(', ')}
            </span>
          </span>
        )}
      </div>
    </Card>
  )
}

function GeneralNotice({ notice }) {
  return (
    <Card accent="notice">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <span className="rounded border border-amber-600/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-amber-300">
            Notice
          </span>
          {notice.title && (
            <h3 className="font-display text-xl tracking-wide text-red-500">{notice.title}</h3>
          )}
        </div>
        <time className="font-display text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          {new Date(notice.postedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </time>
      </div>

      <p className="mt-3 whitespace-pre-line font-display text-[0.95rem] leading-[1.85] text-gray-300">
        {notice.body}
      </p>
    </Card>
  )
}

export default function AnnouncementsFeed({ items }) {
  if (!items || items.length === 0) {
    return <EmptyState>Nothing announced yet this season. Early days.</EmptyState>
  }

  return (
    <div className="space-y-4">
      {items.map((item) =>
        item.kind === 'notice' ? (
          <GeneralNotice key={`notice-${item.id}`} notice={item} />
        ) : (
          <DeathNotice key={`death-${item.id}`} hit={item} />
        )
      )}
    </div>
  )
}
