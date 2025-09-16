import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export const usePermissions = () => {
  const { user, userRole, isAdmin, isContributor } = useAuth()
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch user permissions from the new system
  useEffect(() => {
    if (!user) {
      setPermissions([])
      setLoading(false)
      return
    }

    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('permission')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error fetching permissions:', error)
          // Fallback to legacy role system
          setPermissions(getLegacyPermissions(userRole))
        } else {
          setPermissions(data?.map(p => p.permission) || [])
        }
      } catch (err) {
        console.error('Error fetching permissions:', err)
        // Fallback to legacy role system
        setPermissions(getLegacyPermissions(userRole))
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [user, userRole])

  // Convert legacy roles to permissions for backward compatibility
  const getLegacyPermissions = (role) => {
    switch (role) {
      case 'admin':
        return [
          'admin:full_access',
          'admin:manage_users',
          'admin:manage_roles',
          'family:full_access',
          'family:view_bulletins',
          'family:create_bulletins',
          'family:edit_bulletins',
          'family:delete_bulletins',
          'family:view_contacts',
          'family:manage_contacts',
          'family:view_documents',
          'family:upload_documents',
          'family:manage_documents',
          'recipe:view_recipes',
          'recipe:create_recipes',
          'recipe:edit_recipes',
          'recipe:delete_recipes',
          'recipe:manage_categories',
          'member:basic_access',
          'member:view_profile',
          'member:edit_profile'
        ]
      case 'family':
        return [
          'family:full_access',
          'family:view_bulletins',
          'family:create_bulletins',
          'family:edit_bulletins',
          'family:delete_bulletins',
          'family:view_contacts',
          'family:manage_contacts',
          'family:view_documents',
          'family:upload_documents',
          'family:manage_documents',
          'recipe:view_recipes',
          'recipe:create_recipes',
          'recipe:edit_recipes',
          'member:basic_access',
          'member:view_profile',
          'member:edit_profile'
        ]
      case 'contributor':
        return [
          'recipe:view_recipes',
          'recipe:create_recipes',
          'recipe:edit_recipes',
          'member:basic_access',
          'member:view_profile',
          'member:edit_profile'
        ]
      case 'member':
      default:
        return [
          'member:basic_access',
          'member:view_profile',
          'member:edit_profile'
        ]
    }
  }

  // Permission checking functions
  const hasPermission = (permission) => {
    return permissions.includes(permission)
  }

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => permissions.includes(permission))
  }

  const hasAllPermissions = (permissionList) => {
    return permissionList.every(permission => permissions.includes(permission))
  }

  // Specific permission checks
  const canCreateAnnouncement = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:create_bulletins'
  ])

  const canEditAnnouncement = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:edit_bulletins'
  ])

  const canDeleteAnnouncement = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:delete_bulletins'
  ])

  const canViewAnnouncements = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:view_bulletins'
  ])

  const canCreateContact = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:manage_contacts'
  ])

  const canEditContact = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:manage_contacts'
  ])

  const canDeleteContact = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:manage_contacts'
  ])

  const canViewContacts = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:view_contacts'
  ])

  const canUploadDocuments = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:upload_documents'
  ])

  const canManageDocuments = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:manage_documents'
  ])

  const canViewDocuments = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:view_documents'
  ])

  const canCreateRecipe = hasAnyPermission([
    'admin:full_access',
    'recipe:create_recipes'
  ])

  const canEditRecipe = hasAnyPermission([
    'admin:full_access',
    'recipe:edit_recipes'
  ])

  const canDeleteRecipe = hasAnyPermission([
    'admin:full_access',
    'recipe:delete_recipes'
  ])

  const canViewRecipes = hasAnyPermission([
    'admin:full_access',
    'recipe:view_recipes'
  ])

  const canManageCategories = hasAnyPermission([
    'admin:full_access',
    'recipe:manage_categories'
  ])

  const canManageUsers = hasAnyPermission([
    'admin:full_access',
    'admin:manage_users'
  ])

  const canManageRoles = hasAnyPermission([
    'admin:full_access',
    'admin:manage_roles'
  ])

  // Legacy role compatibility (for backward compatibility)
  const isFamily = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:view_bulletins',
    'family:create_bulletins',
    'family:edit_bulletins',
    'family:delete_bulletins'
  ])

  return {
    // Basic authentication
    isAuthenticated: !!user,
    loading,
    
    // Permission system
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Specific permissions
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
    canCreateRecipe,
    canEditRecipe,
    canDeleteRecipe,
    canViewRecipes,
    canManageCategories,
    canManageUsers,
    canManageRoles,
    
    // Legacy role compatibility
    isAdmin,
    isContributor,
    isFamily,
    userRole,
    
    // Helper functions for complex permission checks
    hasPermission: (permission) => {
      const permissions = {
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
      return permissions[permission] || false
    }
  }
}