import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-6xl font-bold text-gray-900 dark:text-gray-100">404</h1>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mt-4">
            Page not found
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        
        <div className="flex justify-center">
          <Link
            href="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  )
}
