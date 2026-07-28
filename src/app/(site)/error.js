'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Something went wrong!
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            An error occurred while loading this page.
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="text-sm text-red-700 dark:text-red-400">
            <p className="font-medium">Error Details:</p>
            <p className="mt-1">{error.message || 'An unexpected error occurred'}</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={reset}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 bg-gray-300 dark:bg-slate-700 hover:bg-gray-400 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}
