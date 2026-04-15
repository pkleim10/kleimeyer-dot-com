'use client'

import Link from 'next/link'
import VideoMasterShell from './VideoMasterShell'
import { VIDEOMASTER_DMG_HREF, GH_REPO, GH_RELEASES } from './constants'

export default function VideoMasterMarketingPage() {
  return (
    <VideoMasterShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-1 border border-emerald-200/80 dark:border-emerald-800/50 shadow-sm">
          <div className="rounded-xl p-8 sm:p-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-lg">
                <svg className="w-11 h-11 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 mb-1">
                  macOS · local libraries
                </p>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                  VideoMaster
                </h1>
                <p className="text-xl text-gray-700 dark:text-gray-200 mt-4 leading-relaxed">
                  A fast, friendly browser for the video files already on your drives — without locking them inside a
                  closed library vault.
                </p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-3">
              <a
                href={VIDEOMASTER_DMG_HREF}
                download
                className="inline-flex justify-center items-center px-6 py-3.5 rounded-xl bg-emerald-600 text-white text-base font-semibold hover:bg-emerald-700 transition-colors shadow-md"
              >
                Download for macOS
              </a>
              <Link
                href="/other-fun-stuff/VideoMaster/guide"
                className="inline-flex justify-center items-center px-6 py-3.5 rounded-xl border-2 border-emerald-600/80 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
              >
                Full user guide
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              The DMG is hosted on this site at <code className="text-xs bg-gray-100 dark:bg-slate-900 px-1 rounded">{VIDEOMASTER_DMG_HREF}</code>
              — add the file under <code className="text-xs bg-gray-100 dark:bg-slate-900 px-1 rounded">public/downloads/</code> before shipping.
            </p>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What it is</h2>
          <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            VideoMaster helps you <strong>browse and organize video files</strong> that live in ordinary folders on your Mac.
            It does not move your originals into a mystery box: it <strong>indexes</strong> what you point it at, then gives you
            a quick grid or list, search, a powerful <strong>filter strip</strong> (library slices, smart collections, star
            filters, tags), star ratings, optional <strong>custom metadata</strong>, and a detail pane for each file — with
            preview, filmstrip, and playback when you want it.
          </p>
          <p className="mt-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            A <strong>library</strong> is a single database file that remembers your folders, tags, collections, and what the
            app learned about each clip. Your media stays exactly where you put it. Switch libraries from the{' '}
            <strong>File</strong> menu when you need separate workspaces (for example work vs. home archives).
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">What&apos;s cool about it</h2>
          <ul className="mt-6 space-y-4 text-gray-700 dark:text-gray-300">
            <li className="flex gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">·</span>
              <span>
                <strong>Your files, your layout.</strong> Add folders as data sources, rescan when new clips land, and keep
                everything visible in grid or sortable list with configurable columns — including custom fields.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">·</span>
              <span>
                <strong>Filter strip + search.</strong> Slice by &ldquo;Recently added,&rdquo; duplicates, missing files,
                collections built from rules, per-star ratings, and tags — combined with full-text aware search.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">·</span>
              <span>
                <strong>Detail pane that works.</strong> Inline or external playback, filmstrip previews, rename in place,
                tags as chips, and honest delete vs. &ldquo;remove from library only&rdquo; choices.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">·</span>
              <span>
                <strong>Surprise Me</strong> picks from your current filtered set — great for rediscovering footage.
              </span>
            </li>
          </ul>
        </section>

        <section className="mt-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Also on GitHub</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Prefer releases or source? Builds and tags live alongside the repository.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={GH_RELEASES}
              className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              rel="noopener noreferrer"
            >
              GitHub Releases
            </a>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <a href={GH_REPO} className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline" rel="noopener noreferrer">
              Source
            </a>
          </div>
        </section>
      </div>
    </VideoMasterShell>
  )
}
