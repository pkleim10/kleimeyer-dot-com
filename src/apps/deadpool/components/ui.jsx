// Shared presentational primitives for the Dead Pool UI.
//
// Deliberately hook-free and directive-free so the same components can be
// imported by both Server Components (the pages) and Client Components
// (the interactive editors and forms).

export function Divider({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-red-800/70" />
      {/* Geometric shapes and the dagger render as real text, so they take
          our colour — U+2620 (skull) falls back to a colour emoji instead. */}
      <span className="text-[8px] leading-none text-red-700">&#9670;</span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-red-800/70" />
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <header className="relative mb-8">
      {/* Ambient red wash behind the title, tying interior pages back to the
          lit-from-within look of the masthead. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-10 -top-12 h-36"
        style={{
          background:
            'radial-gradient(ellipse 45% 65% at 50% 45%, rgba(220,38,38,0.20), transparent 70%)',
        }}
      />
      <h1 className="relative font-display text-3xl uppercase tracking-[0.14em] text-white drop-shadow-[0_0_20px_rgba(220,38,38,0.45)] sm:text-4xl">
        {title}
      </h1>
      {subtitle && <p className="relative mt-2 text-sm text-gray-400">{subtitle}</p>}
      <Divider className="relative mt-5" />
      {children}
    </header>
  )
}

export function SectionTitle({ children, className = '' }) {
  return (
    <h2
      className={`font-display text-sm uppercase tracking-[0.22em] text-red-500 ${className}`}
    >
      {children}
    </h2>
  )
}

export function Panel({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag
      className={`rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90 shadow-[0_0_40px_-18px_rgba(220,38,38,0.45)] ${className}`}
    >
      {children}
    </Tag>
  )
}

export function StatTile({ value, label, tone = 'default' }) {
  const valueTone = tone === 'accent' ? 'text-red-500' : 'text-white'
  return (
    <div className="flex-1 rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 text-center">
      <p
        className={`font-display text-3xl leading-none ${valueTone} ${
          tone === 'accent' ? 'drop-shadow-[0_0_14px_rgba(220,38,38,0.5)]' : ''
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
    </div>
  )
}

export function EmptyState({ children }) {
  return (
    <Panel className="px-6 py-10 text-center">
      <p className="font-display text-4xl leading-none text-zinc-700" aria-hidden="true">
        &#8224;
      </p>
      <p className="mt-3 text-sm text-gray-500">{children}</p>
    </Panel>
  )
}

// deadpool_hits.date_of_death is a date-only column, so `new Date(value)`
// yields UTC midnight — formatting that in a western timezone renders the
// *previous* day. Always format these in UTC.
export function formatDeathDate(value, options = {}) {
  return new Date(value).toLocaleDateString(undefined, { timeZone: 'UTC', ...options })
}

// Shared control styling, so every form across the app matches.
export const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-black/60 px-3 py-2 text-white placeholder:text-zinc-600 transition focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/40'

export const labelClass =
  'mb-1.5 block text-[11px] uppercase tracking-[0.16em] text-gray-400'

export const primaryButtonClass =
  'rounded-lg bg-red-700 px-5 py-2.5 font-display text-sm uppercase tracking-[0.14em] text-white shadow-[0_0_24px_-6px_rgba(220,38,38,0.8)] transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none'

// Column headers for the app's data tables.
export const thClass =
  'py-2 pr-4 text-[11px] font-normal uppercase tracking-[0.16em] text-gray-500'
