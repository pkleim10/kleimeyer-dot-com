import { useState } from 'react'
import UserPermissionManager from './UserPermissionManager'
import { supabase } from '@/utils/supabase'

export default function UserList({ users, onUpdate, currentUserId }) {
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPermissionManager, setShowPermissionManager] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const openPermissionManager = (user) => {
    setSelectedUser(user)
    setShowPermissionManager(true)
  }

  const closePermissionManager = () => {
    setSelectedUser(null)
    setShowPermissionManager(false)
  }

  const openDeleteModal = (user) => {
    setUserToDelete(user)
    setShowDeleteModal(true)
    setDeleteError('')
  }

  const closeDeleteModal = () => {
    setUserToDelete(null)
    setShowDeleteModal(false)
    setDeleteError('')
  }

  const deleteUser = async () => {
    if (!userToDelete) return

    setDeleting(true)
    setDeleteError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setDeleteError('Not authenticated')
        return
      }

      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        setDeleteError(errorData.error || 'Failed to delete user')
        return
      }

      // Success - close modal and refresh user list
      closeDeleteModal()
      onUpdate()
    } catch (err) {
      console.error('Error deleting user:', err)
      setDeleteError('Failed to delete user')
    } finally {
      setDeleting(false)
    }
  }

  const getUserRole = (userData) => {
    return userData.role || 'member'
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'family': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'member': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-slate-700">
          {users.map((userData) => {
            const user = userData.user
            const displayName = `${user?.first_name || 'Unknown'} ${user?.last_name || 'User'}`
            const isCurrentUser = currentUserId === user?.id
            
            return (
              <li key={userData.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {displayName}
                          </p>
                          {isCurrentUser && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </p>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(getUserRole(userData))}`}>
                            {getUserRole(userData).charAt(0).toUpperCase() + getUserRole(userData).slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Joined: {new Date(userData.created_at).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => openPermissionManager(user)}
                      disabled={isCurrentUser}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-slate-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Manage Role
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
                      disabled={isCurrentUser}
                      className="inline-flex items-center px-3 py-1 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-300 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        
        {users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No users found.</p>
          </div>
        )}
      </div>

      {showPermissionManager && selectedUser && (
        <UserPermissionManager
          user={selectedUser}
          onClose={closePermissionManager}
          onUpdate={onUpdate}
        />
      )}

      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 lg:w-1/3 shadow-lg rounded-md bg-white dark:bg-slate-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Delete User Account
                </h3>
                <button
                  onClick={closeDeleteModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {deleteError && (
                <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {deleteError}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete this user account? This action cannot be undone.
                </p>
                <div className="bg-gray-50 dark:bg-slate-700 p-4 rounded-md">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {userToDelete.first_name} {userToDelete.last_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {userToDelete.email}
                  </p>
                </div>
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-md">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                    Warning: This will permanently delete:
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    <li>• User account and authentication data</li>
                    <li>• User role</li>
                    <li>• User profile information</li>
                    <li>• Any content created by this user</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteUser}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
