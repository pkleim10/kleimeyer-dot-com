'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import LoginModal from './LoginModal'

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const { user, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      await signOut()
      
      // Determine where to redirect after sign out
      let redirectPath = '/'
      
      // If user is on a page that requires authentication, redirect to home
      if (isAuthPage || isAdminPage) {
        redirectPath = '/'
      } else {
        // For other pages (root, recipe pages), stay on the same page
        redirectPath = pathname
      }
      
      // Use router.push for client-side navigation instead of window.location
      router.push(redirectPath)
    } catch (error) {
      console.error('Error signing out:', error)
      // If there was an error but user state was cleared, redirect to home
      router.push('/')
    }
  }

  const isActive = (path) => {
    if (path === '/recipe/search') {
      // For the Search link, show active when on search page
      return pathname === '/recipe/search'
    }
    return pathname === path
  }

  // Determine navigation type based on current page
  const isRootPage = pathname === '/'
  const isAuthPage = pathname === '/signup' || pathname === '/profile'
  const isAdminPage = pathname === '/admin'
  const isRecipePage = pathname.startsWith('/recipe')

  // Show simplified navigation on root page (just auth links)
  if (isRootPage) {
    return (
      <nav className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                Kleimeyer.com
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Profile Link */}
                  <Link
                    href="/profile"
                    className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                  >
                    Profile
                  </Link>
                  
                  {/* Admin Link - Only visible to admins */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                    >
                      Admin
                    </Link>
                  )}
                  
                  <button
                    onClick={handleSignOut}
                    className="text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {/* Combined Sign Up / Sign In Link */}
                  <Link
                    href={`/signup?redirect=${encodeURIComponent(pathname)}`}
                    className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                  >
                    Sign Up / Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                {/* Icon for menu */}
                <svg
                  className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Icon for close */}
                <svg
                  className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu for root page */}
        <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                {/* Profile Link - Mobile */}
                <Link
                  href="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Profile
                </Link>
                
                {/* Admin Link - Mobile - Only visible to admins */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Admin
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {/* Combined Sign Up / Sign In Link - Mobile */}
                <Link
                  href={`/signup?redirect=${encodeURIComponent(pathname)}`}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Sign Up / Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        
        <LoginModal 
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          redirectUrl={pathname}
        />
      </nav>
    )
  }

  // Show minimal navigation for auth pages (signup, profile)
  if (isAuthPage) {
    return (
      <nav className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                Kleimeyer.com
              </Link>
            </div>
            
                         <div className="flex items-center space-x-4">
               {user ? (
                 <>
                   {isAdmin && (
                     <Link
                       href="/admin"
                       className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                     >
                       Admin
                     </Link>
                   )}
                   
                   <button
                     onClick={handleSignOut}
                     className="text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                   >
                     Sign Out
                   </button>
                 </>
               ) : null}
             </div>
          </div>
        </div>
      </nav>
    )
  }

  // Show admin navigation for admin page
  if (isAdminPage) {
    return (
      <nav className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
                         <div className="flex-shrink-0 flex items-center">
               <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                 Kleimeyer.com
               </Link>
             </div>
            
                         <div className="flex items-center space-x-4">
               <Link
                 href="/profile"
                 className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
               >
                 Profile
               </Link>
               
               <button
                 onClick={handleSignOut}
                 className="text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
               >
                 Sign Out
               </button>
             </div>
          </div>
        </div>
      </nav>
    )
  }

  // Show recipe navigation for recipe pages
  if (isRecipePage) {
    return (
      <nav className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  Kleimeyer.com
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/recipe/search"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/recipe/search')
                      ? 'border-indigo-500 text-gray-900 dark:text-gray-100'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Search
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  {/* Profile Link */}
                  <Link
                    href="/profile"
                    className={`text-sm font-medium ${
                      pathname === '/profile'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    Profile
                  </Link>
                  
                  {/* Admin Link - Only visible to admins */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className={`text-sm font-medium ${
                        pathname === '/admin'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                      }`}
                    >
                      Admin
                    </Link>
                  )}
                  
                  <button
                    onClick={handleSignOut}
                    className="text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {/* Combined Sign Up / Sign In Link */}
                  <Link
                    href={`/signup?redirect=${encodeURIComponent(pathname)}`}
                    className={`text-sm font-medium ${
                      pathname === '/signup'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    Sign Up / Sign In
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="sm:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Open main menu</span>
                {/* Icon for menu */}
                <svg
                  className={`${isOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                {/* Icon for close */}
                <svg
                  className={`${isOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/recipe/search"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/recipe/search')
                  ? 'text-indigo-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Search
            </Link>

            {user ? (
              <>
                {/* Profile Link - Mobile */}
                <Link
                  href="/profile"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === '/profile'
                      ? 'text-indigo-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Profile
                </Link>
                
                {/* Admin Link - Mobile - Only visible to admins */}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      pathname === '/admin'
                        ? 'text-red-500'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    Admin
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {/* Combined Sign Up / Sign In Link - Mobile */}
                <Link
                  href={`/signup?redirect=${encodeURIComponent(pathname)}`}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    pathname === '/signup'
                      ? 'text-indigo-500'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Sign Up / Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        
        <LoginModal 
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          redirectUrl={pathname}
        />
      </nav>
    )
  }

  // Default navigation for any other pages
  return (
    <nav className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              Kleimeyer.com
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                >
                  Profile
                </Link>
                
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                  >
                    Admin
                  </Link>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href={`/signup?redirect=${encodeURIComponent(pathname)}`}
                  className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                >
                  Sign Up / Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 