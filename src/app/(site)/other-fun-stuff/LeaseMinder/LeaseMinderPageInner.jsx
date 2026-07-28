'use client'

import Link from 'next/link'
import LeaseMinderApp from './LeaseMinderApp'

export default function LeaseMinderPageInner() {
  return (
    <>
      <div className="mb-8">
        <Link
          href="/other-fun-stuff"
          className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors duration-300 mb-4"
        >
          <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Other Fun Stuff
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-400">
              kleimeyer.com · Other Fun Stuff
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">LeaseMinder</h1>
          </div>
        </div>
      </div>

      <LeaseMinderApp />

      <p className="mt-8 text-xs text-gray-500 dark:text-gray-400 max-w-3xl">
        Projections use a straight-line trend from lease start and are for planning only. Confirm all figures with
        your lease or finance company.
      </p>
    </>
  )
}
