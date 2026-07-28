'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/utils/supabase'

export default function HomePage() {
  const { user } = useAuth()
  const { canViewFamily } = usePermissions()
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false)
  const [checkingAnnouncements, setCheckingAnnouncements] = useState(false)

  // Check for new announcements since user's last visit to family page
  const checkForNewAnnouncements = useCallback(async () => {
    if (!user || !canViewFamily) return
    
    setCheckingAnnouncements(true)
    try {
      // Get user's last visit to family page from localStorage
      const lastFamilyVisit = localStorage.getItem(`lastFamilyVisit_${user.id}`)
      const lastVisitTime = lastFamilyVisit ? new Date(lastFamilyVisit) : new Date(user.last_sign_in_at)
      
      // Check for announcements created after last visit
      const { data: newAnnouncements, error } = await supabase
        .from('family_bulletins')
        .select('id, created_at')
        .gt('created_at', lastVisitTime.toISOString())
        .limit(1)
      
      if (error) {
        console.error('Error checking for new announcements:', error)
        return
      }
      
      setHasNewAnnouncements(newAnnouncements && newAnnouncements.length > 0)
    } catch (error) {
      console.error('Error checking for new announcements:', error)
    } finally {
      setCheckingAnnouncements(false)
    }
  }, [user, canViewFamily])

  // Check for new announcements when user and permissions are loaded
  useEffect(() => {
    if (user && canViewFamily) {
      checkForNewAnnouncements()
    }
  }, [user, canViewFamily, checkForNewAnnouncements])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Hero Section */}
      <div className="relative bg-gray-900">
        {/* Hero Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/main-hero.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gray-900/60" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 sm:text-5xl md:text-6xl">
              Welcome to kleimeyer-dot-com
            </h1>
            <p className="text-lg text-gray-100 mb-8 max-w-2xl mx-auto">
              Your digital hub for family information and more.
            </p>
          </div>
        </div>
      </div>

      {/* Apps Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap justify-center gap-8">
          {/* Photo Albums App */}
          {canViewFamily && (
            <Link href="/photos" className="group w-full max-w-sm">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <div className="relative h-48 bg-gradient-to-br from-green-500 to-emerald-600">
                  <img
                    src="/album-card.png"
                    alt="Photo Albums"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                    Gallery
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Cherish and share precious memories through our curated photo collection
                  </p>
                  <div className="mt-auto flex items-center text-green-600 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors duration-300">
                    <span className="text-sm font-medium">View Photos</span>
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Mom&apos;s Recipes App */}
          <Link href="/recipe" className="group w-full max-w-sm">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
              <div className="relative h-48 bg-gradient-to-br from-indigo-500 to-purple-600">
                <img
                  src="https://bqhwibhrukfryafwwwat.supabase.co/storage/v1/object/public/recipe-images/mom.jpeg"
                  alt="Mom&apos;s Kitchen"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                  Mom&apos;s Recipes
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Discover our collection of cherished family recipes, lovingly passed down through generations
                </p>
                <div className="mt-auto flex items-center text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors duration-300">
                  <span className="text-sm font-medium">Explore Recipes</span>
                  <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Family Business App - Only show if user has family permissions */}
          {canViewFamily && (
            <Link href="/family" className="group w-full max-w-sm">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-indigo-600">
                  <img
                    src="/Family.jpeg"
                    alt="Family Business"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 to-indigo-700/50" />
                  
                  {/* New Announcements Badge */}
                  {hasNewAnnouncements && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white animate-pulse shadow-lg">
                        New!
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                    Family Business
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Stay connected and informed with important family contacts and updates
                  </p>
                  <div className="mt-auto flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-300">
                    <span className="text-sm font-medium">Get Started</span>
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Other Fun Stuff App - Only show if user is logged in */}
          {user && (
            <Link href="/other-fun-stuff" className="group w-full max-w-sm">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 h-full flex flex-col">
                <div className="relative h-48 bg-gradient-to-br from-purple-500 to-pink-600">
                  <img
                    src="/just-for-me.jpg"
                    alt="Other Fun Stuff"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-300">
                    Other Fun Stuff
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    Personalized apps and features only for you
                  </p>
                  <div className="mt-auto flex items-center text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors duration-300">
                    <span className="text-sm font-medium">Explore</span>
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
} 