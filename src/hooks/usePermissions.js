import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

export const usePermissions = () => {
  const { user } = useAuth()
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
          setPermissions([])
        } else {
          setPermissions(data?.map(p => p.permission) || [])
        }
      } catch (err) {
        console.error('Error fetching permissions:', err)
        setPermissions([])
      } finally {
        setLoading(false)
      }
    }

    fetchPermissions()
  }, [user])


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

  const canCreateSharedMedicationGroups = hasAnyPermission([
    'admin:full_access',
    'medication:create_shared_groups'
  ])

  const canViewSharedMedicationGroups = hasAnyPermission([
    'admin:full_access',
    'medication:view_shared_groups'
  ])

  const canEditSharedMedicationGroups = hasAnyPermission([
    'admin:full_access',
    'medication:edit_shared_groups'
  ])

  const canDeleteSharedMedicationGroups = hasAnyPermission([
    'admin:full_access',
    'medication:delete_shared_groups'
  ])

  const canManageUsers = hasAnyPermission([
    'admin:full_access',
    'admin:manage_users'
  ])

  const canManageRoles = hasAnyPermission([
    'admin:full_access',
    'admin:manage_roles'
  ])

  const canViewFamily = hasAnyPermission([
    'admin:full_access',
    'family:full_access',
    'family:view_bulletins',
    'family:create_bulletins',
    'family:edit_bulletins',
    'family:delete_bulletins',
    'family:view_contacts',
    'family:create_contacts',
    'family:edit_contacts',
    'family:delete_contacts',
    'family:view_documents',
    'family:upload_documents',
    'family:manage_documents'
  ])



  return {
    // Basic authentication
    isAuthenticated: !!user,
    loading,
    permissionsLoading: loading,
    
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
    canViewFamily,
    canCreateSharedMedicationGroups,
    canViewSharedMedicationGroups,
    canEditSharedMedicationGroups,
    canDeleteSharedMedicationGroups,
    
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