import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export const usePermissions = () => {
  const { user } = useAuth()
  const [role, setRole] = useState(null) // 'member', 'family', 'admin', or null (unauthenticated)
  const [loading, setLoading] = useState(true)

  // Fetch user role from user_roles table
  useEffect(() => {
    if (!user) {
      setRole(null) // Unauthenticated
      setLoading(false)
      return
    }

    const fetchRole = async () => {
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single()

        if (error) {
          // If no role found, default to 'member'
          if (error.code === 'PGRST116') {
            setRole('member')
          } else {
            console.error('Error fetching role:', error)
            setRole('member') // Default to member on error
          }
        } else {
          setRole(data?.role || 'member')
        }
      } catch (err) {
        console.error('Error fetching role:', err)
        setRole('member') // Default to member on error
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [user])

  // Role checking functions
  const isAuthenticated = !!user
  const isMember = role === 'member'
  const isFamily = role === 'family'
  const isAdmin = role === 'admin'

  // Specific permission checks based on roles
  // Recipes: View - All users (authenticated and unauthenticated)
  const canViewRecipes = true // Everyone can view recipes

  // Recipes: Add/Edit/Delete - Family or Admin
  const canCreateRecipe = isFamily || isAdmin
  const canEditRecipe = isFamily || isAdmin
  const canDeleteRecipe = isFamily || isAdmin

  // Recipe Categories: View - All users
  const canViewCategories = true // Everyone can view categories

  // Recipe Categories: Add/Edit/Delete - Family or Admin
  const canManageCategories = isFamily || isAdmin

  // Family Business: All operations - Family or Admin (authenticated only)
  const canViewFamily = (isFamily || isAdmin) && isAuthenticated
  const canCreateAnnouncement = (isFamily || isAdmin) && isAuthenticated
  const canEditAnnouncement = (isFamily || isAdmin) && isAuthenticated
  const canDeleteAnnouncement = (isFamily || isAdmin) && isAuthenticated
  const canViewAnnouncements = (isFamily || isAdmin) && isAuthenticated

  const canCreateContact = (isFamily || isAdmin) && isAuthenticated
  const canEditContact = (isFamily || isAdmin) && isAuthenticated
  const canDeleteContact = (isFamily || isAdmin) && isAuthenticated
  const canViewContacts = (isFamily || isAdmin) && isAuthenticated

  const canUploadDocuments = (isFamily || isAdmin) && isAuthenticated
  const canManageDocuments = (isFamily || isAdmin) && isAuthenticated
  const canViewDocuments = (isFamily || isAdmin) && isAuthenticated

  // Photo Albums: All operations - Family or Admin (authenticated only)
  const canViewPhotos = (isFamily || isAdmin) && isAuthenticated

  // Shared Medications: All operations - Family or Admin (authenticated only)
  const canCreateSharedMedicationGroups = (isFamily || isAdmin) && isAuthenticated
  const canViewSharedMedicationGroups = (isFamily || isAdmin) && isAuthenticated
  const canEditSharedMedicationGroups = (isFamily || isAdmin) && isAuthenticated
  const canDeleteSharedMedicationGroups = (isFamily || isAdmin) && isAuthenticated

  // Admin: Admin only (authenticated only)
  const canManageUsers = isAdmin && isAuthenticated
  const canManageRoles = isAdmin && isAuthenticated

  // Backward compatibility: hasPermission function for legacy code
  const hasPermission = (permission) => {
    const permissionMap = {
      'create:recipe': canCreateRecipe,
      'edit:recipe': canEditRecipe,
      'delete:recipe': canDeleteRecipe,
      'create:category': canManageCategories,
      'edit:category': canManageCategories,
      'delete:category': canManageCategories,
      'access:documents': canViewDocuments,
      'upload:documents': canUploadDocuments,
      'edit:documents': canManageDocuments,
      'delete:documents': canManageDocuments,
      'manage:categories': canManageCategories,
      'create:announcement': canCreateAnnouncement,
      'edit:announcement': canEditAnnouncement,
      'delete:announcement': canDeleteAnnouncement,
      'create:contact': canCreateContact,
      'edit:contact': canEditContact,
      'delete:contact': canDeleteContact,
      'manage:users': canManageUsers,
    }
    return permissionMap[permission] || false
  }

  return {
    // Basic authentication
    isAuthenticated,
    loading,
    permissionsLoading: loading,
    
    // Role system
    role, // 'member', 'family', 'admin', or null
    isMember,
    isFamily,
    isAdmin,
    
    // Specific permissions
    canViewRecipes,
    canCreateRecipe,
    canEditRecipe,
    canDeleteRecipe,
    canViewCategories,
    canManageCategories,
    canViewFamily,
    canCreateAnnouncement,
    canEditAnnouncement,
    canDeleteAnnouncement,
    canViewAnnouncements,
    canCreateContact,
    canEditContact,
    canDeleteContact,
    canViewContacts,
    canUploadDocuments,
    canManageDocuments,
    canViewDocuments,
    canViewPhotos,
    canManageUsers,
    canManageRoles,
    canCreateSharedMedicationGroups,
    canViewSharedMedicationGroups,
    canEditSharedMedicationGroups,
    canDeleteSharedMedicationGroups,
    
    // Backward compatibility
    hasPermission,
    // Legacy: permissions array (empty for role-based system)
    permissions: [],
    hasAnyPermission: () => false,
    hasAllPermissions: () => false,
  }
}
