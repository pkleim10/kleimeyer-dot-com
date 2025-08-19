'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

export default function HomePage() {
  const { user, isAdmin } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 sm:text-5xl md:text-6xl">
              Welcome to Kleimeyer.com
            </h1>
            <p className="text-lg text-gray-100 mb-8 max-w-2xl mx-auto">
              Your digital hub for family favorites, recipes, and more. Explore our collection of apps and tools.
            </p>
          </div>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Mom&apos;s Recipes App */}
          <Link href="/recipe" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600">
                <img
                  src="https://bqhwibhrukfryafwwwat.supabase.co/storage/v1/object/public/recipe-images/mom.jpeg"
                  alt="Mom&apos;s Kitchen"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  Mom&apos;s Recipes
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Discover our collection of cherished family recipes, lovingly passed down through generations
                </p>
                <div className="mt-4 flex items-center text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Explore Recipes</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Family Matters App */}
          <Link href="/family" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-indigo-700/90" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-white/80" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                  </svg>
                </div>
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  Family Matters
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Stay connected and informed with important family contacts and updates
                </p>
                <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                  <span className="text-sm font-medium">View Contacts</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 