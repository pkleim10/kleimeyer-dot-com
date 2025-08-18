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
          {/* Mom's Recipes App */}
          <Link href="/recipe" className="group">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600">
                <img
                  src="https://bqhwibhrukfryafwwwat.supabase.co/storage/v1/object/public/recipe-images/mom.jpeg"
                  alt="Mom's Kitchen"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  Mom's Recipes
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

          {/* Placeholder for future apps */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden opacity-60">
            <div className="h-48 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Coming Soon</p>
              </div>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-400 dark:text-gray-500 mb-2">
                New App
              </h2>
              <p className="text-gray-400 dark:text-gray-500">
                More applications coming soon...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 