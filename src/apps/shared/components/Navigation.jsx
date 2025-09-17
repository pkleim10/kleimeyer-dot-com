'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'
import { useRouter, usePathname } from 'next/navigation'
import { getRandomNavImage } from '@/utils/navImages'

// Navigation context detection
const getNavigationContext = (pathname) => {
  if (pathname === '/') return { app: 'home', section: null, page: 'home' }
  if (pathname === '/signup') return { app: 'auth', section: 'signup', page: 'signup' }
  if (pathname === '/login') return { app: 'auth', section: 'login', page: 'login' }
  if (pathname === '/profile') return { app: 'auth', section: 'profile', page: 'profile' }
  if (pathname === '/admin') return { app: 'admin', section: 'dashboard', page: 'admin' }
  if (pathname === '/family') return { app: 'family', section: 'home', page: 'family-home' }
  if (pathname === '/family/announcements') return { app: 'family', section: 'announcements', page: 'announcements' }
  if (pathname === '/family/documents') return { app: 'family', section: 'documents', page: 'documents' }
  if (pathname.startsWith('/recipe')) {
    if (pathname === '/recipe') return { app: 'recipes', section: 'home', page: 'recipes-home' }
    if (pathname === '/recipe/search') return { app: 'recipes', section: 'search', page: 'search' }
    if (pathname.startsWith('/recipe/categories/')) return { app: 'recipes', section: 'categories', page: 'category' }
    if (pathname.startsWith('/recipe/recipes/')) return { app: 'recipes', section: 'recipes', page: 'recipe-detail' }
    return { app: 'recipes', section: 'unknown', page: 'unknown' }
  }
  return { app: 'unknown', section: null, page: 'unknown' }
}

// Helper function to extract category name from URL
const extractCategoryName = (pathname) => {
  if (pathname.startsWith('/recipe/categories/')) {
    const slug = pathname.replace('/recipe/categories/', '')
    // Convert slug back to readable name (e.g., "holiday-favorites" -> "Holiday Favorites")
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return null
}

// Breadcrumb generation
const generateBreadcrumbs = (pathname) => {
  const context = getNavigationContext(pathname)
  const breadcrumbs = [{ name: 'Home', href: '/', current: pathname === '/' }]

  switch (context.app) {
    case 'recipes':
      breadcrumbs.push({ name: 'Recipes', href: '/recipe', current: pathname === '/recipe' })
      if (context.section === 'search') {
        breadcrumbs.push({ name: 'Search', href: '/recipe/search', current: true })
      } else if (context.section === 'categories') {
        breadcrumbs.push({ name: 'Categories', href: '/recipe/categories', current: false })
        // Extract actual category name from URL
        const categoryName = extractCategoryName(pathname)
        breadcrumbs.push({ name: categoryName || 'Category', href: pathname, current: true })
      } else if (context.section === 'recipes') {
        breadcrumbs.push({ name: 'Search', href: '/recipe/search', current: false })
        breadcrumbs.push({ name: 'Recipe', href: pathname, current: true })
      }
      break
    case 'family':
      breadcrumbs.push({ name: 'Family Business', href: '/family', current: context.section === 'home' })
      if (context.section === 'announcements') {
        breadcrumbs.push({ name: 'Announcements', href: '/family/announcements', current: true })
      } else if (context.section === 'documents') {
        breadcrumbs.push({ name: 'Documents', href: '/family/documents', current: true })
      }
      break
    case 'admin':
      breadcrumbs.push({ name: 'Admin', href: '/admin', current: true })
      break
    case 'auth':
      if (context.section === 'signup') {
        breadcrumbs.push({ name: 'Sign Up', href: '/signup', current: true })
      } else if (context.section === 'login') {
        breadcrumbs.push({ name: 'Sign In', href: '/login', current: true })
      } else if (context.section === 'profile') {
        breadcrumbs.push({ name: 'Profile', href: '/profile', current: true })
      }
      break
  }

  return breadcrumbs
}

// App section navigation items
const getAppNavigation = (context, user, canManageUsers) => {
  switch (context.app) {
    case 'recipes':
      return [
        { name: 'Recipes', href: '/recipe', current: context.section === 'home' },
        { name: 'Search', href: '/recipe/search', current: context.section === 'search' }
      ]
    case 'family':
      return [
        { name: 'Contacts', href: '/family', current: context.section === 'home' },
        { name: 'Announcements', href: '/family/announcements', current: context.section === 'announcements' },
        { name: 'Documents', href: '/family/documents', current: context.section === 'documents' }
      ]
    case 'admin':
      return [
        { name: 'Dashboard', href: '/admin', current: true },
        // Future admin sections can be added here
      ]
    case 'auth':
      return []
    default:
      return []
  }
}

export default function Navigation() {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [navImage, setNavImage] = useState('')
  const { user, signOut } = useAuth()
  const { canManageUsers } = usePermissions()
  const router = useRouter()
  const pathname = usePathname()

  // Set random navigation image on component mount
  useEffect(() => {
    const randomImage = getRandomNavImage()
    setNavImage(randomImage)
  }, [])

  const context = getNavigationContext(pathname)
  const breadcrumbs = generateBreadcrumbs(pathname)
  const appNavigation = getAppNavigation(context, user, canManageUsers)

  const handleSignOut = async () => {
    try {
      await signOut()
      
      // Smart redirect: stay on public pages, go home from private pages
      const isPrivatePage = ['/admin', '/profile', '/signup', '/login'].includes(pathname)
      const redirectPath = isPrivatePage ? '/' : pathname
      router.push(redirectPath)
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/')
    }
  }

  return (
    <>
      <nav id="nav" className="bg-white dark:bg-slate-800 shadow-lg border-b border-gray-200 dark:border-slate-700 overflow-visible">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-visible">
          {/* Top Bar - Brand, Navigation Links, and User Actions */}
          <div id="nav-top" className="flex justify-between h-16 overflow-visible">
            {/* Brand */}
            <div className="flex items-center relative overflow-visible">
              <Link href="/" className="flex items-center relative">
                {/* Invisible spacer to reserve space for the logo */}
                <div className="w-24 h-12" />
                <img
                  src={navImage || "/kleimeyer-dot-com.jpeg"}
                  alt="Kleimeyer.com"
                  className="absolute top-0 left-0 object-cover object-center"
                  style={{ 
                    top: '-8px',
                    height: '64px',
                    width: '80px'
                  }}
                />
              </Link>
              
              {/* App Navigation Links - Desktop */}
              {appNavigation.length > 0 && (
                <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                  {appNavigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        item.current
                          ? 'border-indigo-500 text-gray-900 dark:text-gray-100'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              {appNavigation.length > 0 && (
                <div className="sm:hidden">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                    aria-expanded="false"
                  >
                    <span className="sr-only">Open main menu</span>
                    {!isMobileMenuOpen ? (
                      <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    ) : (
                      <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
              {user ? (
                <div className="relative">
                  {/* User Menu Button */}
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <span className="sr-only">Open user menu</span>
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.user_metadata?.first_name?.[0] || user.email?.[0] || 'U'}
                      </span>
                    </div>
                  </button>

                  {/* User Menu Dropdown */}
                  {isUserMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-slate-600">
                        <div className="font-medium">
                          {user.user_metadata?.first_name && user.user_metadata?.last_name
                            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                            : user.email}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </div>
                      </div>
                      
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      
                      {canManageUsers && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Admin Panel
                        </Link>
                      )}
                      
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          handleSignOut()
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-600"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={`/login?redirect=${encodeURIComponent(pathname)}`}
                  className="text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
                >
                  Sign Up / Sign In
                </Link>
              )}


            </div>
          </div>

        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && appNavigation.length > 0 && (
          <div className="sm:hidden relative z-50">
            <div className="pt-2 pb-3 space-y-1 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg">
              {appNavigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors ${
                    item.current
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-400 dark:text-indigo-300'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    console.log('Mobile menu link clicked:', item.name, item.href)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}

      </nav>

      {/* Breadcrumbs - Bottom section with distinct styling */}
      {breadcrumbs.length > 1 && (
        <div id="breadcrumb" className="bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-2">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((breadcrumb, index) => (
                    <li key={`${breadcrumb.href}-${index}`} className="flex items-center">
                      {index > 0 && (
                        <svg className="flex-shrink-0 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      <Link
                        href={breadcrumb.href}
                        className={`text-sm font-medium ${
                          breadcrumb.current
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        {breadcrumb.name}
                      </Link>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsUserMenuOpen(false)
            setIsMobileMenuOpen(false)
          }}
        />
      )}
    </>
  )
} 