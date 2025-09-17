'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { createClient } from '@supabase/supabase-js'
import { usePermissions } from '@/hooks/usePermissions'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const { permissions, loading: permissionsLoading } = usePermissions()
  const router = useRouter()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  // Function to determine role from permissions
  const getUserRole = () => {
    if (!permissions || permissions.length === 0) return 'member'
    
    const permissionList = permissions.map(p => p.permission)
    
    if (permissionList.includes('admin:full_access')) {
      return 'admin'
    } else if (permissionList.includes('family:full_access')) {
      return 'family'
    } else if (permissionList.some(p => p.startsWith('recipe:'))) {
      return 'contributor'
    }
    
    return 'member'
  }

  useEffect(() => {
    // Wait for auth and permissions to be ready
    if (!authLoading && !permissionsLoading) {
      if (!user) {
        router.push('/')
        return
      }

      // Load existing user data
      if (user.user_metadata) {
        setFormData({
          firstName: user.user_metadata.first_name || '',
          lastName: user.user_metadata.last_name || ''
        })
      }

      setPageLoading(false)
    }
  }, [user, authLoading, permissionsLoading, router])

  // Debug loading state
  useEffect(() => {
    console.log('Loading state changed:', loading)
  }, [loading])

  // Show loading while auth and permissions are being determined
  if (authLoading || permissionsLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
            Loading...
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      console.log('Updating profile...')
      
      // Get the current session to access the token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Use our custom API endpoint
      const response = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      })

      const result = await response.json()
      console.log('Update result:', result)

      if (!response.ok) {
        setError(result.error || 'Failed to update profile')
      } else {
        console.log('Update successful')
        setSuccess('Profile updated successfully!')
        
        // Force a session refresh to get updated user data
        await supabase.auth.refreshSession()
        
        // Update the form data to reflect the changes immediately
        setFormData({
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred: ' + err.message)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const formatRole = (role) => {
    if (!role) return 'Unknown'
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Please sign in to access your profile
          </h2>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Update Profile
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Update your first and last name
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-400">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md bg-green-50 dark:bg-green-900/30 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-300">
                  Success
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                  <p>{success}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Role Display */}
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-black bg-orange-200 dark:text-black dark:bg-orange-300">
              {formatRole(getUserRole())}
            </span>
          </div>

          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              value={formData.firstName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-gray-100"
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              value={formData.lastName}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-gray-100"
              placeholder="Enter your last name"
            />
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </div>
        </form>


      </div>
    </div>
  )
}
