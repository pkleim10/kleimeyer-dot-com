import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

const PERMISSION_CATEGORIES = {
  'Admin': [
    { id: 'admin:full_access', label: 'Full Admin Access', description: 'Complete system access' },
    { id: 'admin:manage_users', label: 'Manage Users', description: 'Add, edit, and remove users' },
    { id: 'admin:manage_roles', label: 'Manage Permissions', description: 'Grant and revoke permissions' },
    { id: 'admin:system_settings', label: 'System Settings', description: 'Configure system settings' }
  ],
  'Family': [
    { id: 'family:full_access', label: 'Full Family Access', description: 'All family features' },
    { id: 'family:view_bulletins', label: 'View Announcements', description: 'View family announcements' },
    { id: 'family:create_bulletins', label: 'Create Announcements', description: 'Create new announcements' },
    { id: 'family:edit_bulletins', label: 'Edit Announcements', description: 'Edit existing announcements' },
    { id: 'family:delete_bulletins', label: 'Delete Announcements', description: 'Delete announcements' },
    { id: 'family:view_contacts', label: 'View Contacts', description: 'View family contacts' },
    { id: 'family:create_contacts', label: 'Create Contacts', description: 'Add new contacts' },
    { id: 'family:edit_contacts', label: 'Edit Contacts', description: 'Edit existing contacts' },
    { id: 'family:delete_contacts', label: 'Delete Contacts', description: 'Delete contacts' },
    { id: 'family:manage_contacts', label: 'Manage Contacts', description: 'Add, edit, and delete contacts' },
    { id: 'family:view_documents', label: 'View Documents', description: 'View family documents' },
    { id: 'family:upload_documents', label: 'Upload Documents', description: 'Upload new documents' },
    { id: 'family:manage_documents', label: 'Manage Documents', description: 'Full document management' }
  ],
  'Recipe': [
    { id: 'recipe:view_recipes', label: 'View Recipes', description: 'View recipe collection' },
    { id: 'recipe:create_recipes', label: 'Create Recipes', description: 'Add new recipes' },
    { id: 'recipe:edit_recipes', label: 'Edit Recipes', description: 'Edit existing recipes' },
    { id: 'recipe:delete_recipes', label: 'Delete Recipes', description: 'Delete recipes' },
    { id: 'recipe:manage_categories', label: 'Manage Categories', description: 'Manage recipe categories' }
  ],
  'Member': [
    { id: 'member:basic_access', label: 'Basic Access', description: 'Basic authenticated access' },
    { id: 'member:view_profile', label: 'View Profile', description: 'View own profile' },
    { id: 'member:edit_profile', label: 'Edit Profile', description: 'Edit own profile' }
  ]
}

const ROLE_PRESETS = {
  'admin': [
    'admin:full_access'
  ],
  'family': [
    'family:full_access',
    'recipe:view_recipes', 'recipe:create_recipes', 'recipe:edit_recipes',
    'member:basic_access', 'member:view_profile', 'member:edit_profile'
  ],
  'contributor': [
    'recipe:view_recipes', 'recipe:create_recipes', 'recipe:edit_recipes',
    'member:basic_access', 'member:view_profile', 'member:edit_profile'
  ],
  'member': [
    'member:basic_access', 'member:view_profile', 'member:edit_profile', 'recipe:view_recipes'
  ]
}

export default function UserPermissionManager({ user, onClose, onUpdate }) {
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('')

  useEffect(() => {
    if (user) {
      fetchUserPermissions()
    }
  }, [user])

  const fetchUserPermissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`/api/admin/permissions?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch permissions')
        return
      }

      const { permissions: userPermissions } = await response.json()
      setPermissions(userPermissions?.map(p => p.permission) || [])
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setError('Failed to fetch permissions')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permissionId, category) => {
    setPermissions(prev => {
      const categoryPermissions = PERMISSION_CATEGORIES[category] || []
      const categoryIds = categoryPermissions.map(p => p.id)
      const fullAccessId = categoryPermissions.find(p => p.id.endsWith(':full_access'))?.id || null

      const isChecked = prev.includes(permissionId)
      const isFullAccess = fullAccessId && permissionId === fullAccessId

      if (isFullAccess) {
        // Toggle full access: when enabling, remove other category perms; when disabling, just remove it
        if (isChecked) {
          return prev.filter(p => p !== fullAccessId)
        }
        // Enable full access: remove other permissions in this category, add full access
        const filtered = prev.filter(p => !categoryIds.includes(p))
        return [...filtered, fullAccessId]
      }

      // Toggling a granular permission
      // If enabling any granular, ensure full access for this category is cleared
      let next = isChecked ? prev.filter(p => p !== permissionId) : [...prev, permissionId]
      if (fullAccessId && next.includes(permissionId)) {
        next = next.filter(p => p !== fullAccessId)
      }
      return next
    }
  )
  }

  const applyPreset = (presetName) => {
    setSelectedPreset(presetName)
    setPermissions(ROLE_PRESETS[presetName] || [])
  }

  const savePermissions = async () => {
    setSaving(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Not authenticated')
        return
      }

      // Get current permissions
      const currentResponse = await fetch(`/api/admin/permissions?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!currentResponse.ok) {
        setError('Failed to fetch current permissions')
        return
      }

      const { permissions: currentPermissions } = await currentResponse.json()
      const currentPermissionIds = currentPermissions?.map(p => p.permission) || []

      // Determine which permissions to add and remove
      const toAdd = permissions.filter(p => !currentPermissionIds.includes(p))
      const toRemove = currentPermissionIds.filter(p => !permissions.includes(p))

      // Add new permissions
      for (const permission of toAdd) {
        const response = await fetch('/api/admin/permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            userId: user.id,
            permission
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to grant permission')
        }
      }

      // Remove permissions
      for (const permission of toRemove) {
        const response = await fetch(`/api/admin/permissions?userId=${user.id}&permission=${permission}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to revoke permission')
        }
      }

      onUpdate()
      onClose()
    } catch (err) {
      console.error('Error saving permissions:', err)
      setError(err.message || 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-slate-800">
          <div className="text-center py-8">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-900 dark:text-gray-100">
              Loading permissions...
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white dark:bg-slate-800">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Manage Permissions
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user?.first_name} {user?.last_name} ({user?.email})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <div className="text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            </div>
          )}

          {/* Role Presets */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ROLE_PRESETS).map(preset => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    selectedPreset === preset
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {preset.charAt(0).toUpperCase() + preset.slice(1)}
                </button>
              ))}
              <button
                onClick={() => { setSelectedPreset('remove_all'); setPermissions([]) }}
                className={`px-3 py-1 text-sm rounded-md border ${
                  selectedPreset === 'remove_all'
                    ? 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-600'
                }`}
              >
                Remove All
              </button>
            </div>
          </div>

          {/* Permission Categories */}
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, categoryPermissions]) => (
                <div key={category} className="border border-gray-200 dark:border-slate-700 rounded-md p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    {category} Permissions
                  </h4>
                  <div className="space-y-2">
                    {categoryPermissions.map((permission, idx) => (
                      <div key={permission.id}>
                        <label className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={permissions.includes(permission.id)}
                            onChange={() => togglePermission(permission.id, category)}
                            className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {permission.label}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {permission.description}
                            </div>
                          </div>
                        </label>
                        {/* Separator below Full Access option if present */}
                        {idx === 0 && permission.id.endsWith(':full_access') && (
                          <hr className="my-2 border-gray-200 dark:border-slate-700" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={savePermissions}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
