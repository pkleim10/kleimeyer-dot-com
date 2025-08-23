import { useAuth } from '@/contexts/AuthContext'

export const usePermissions = () => {
  const { user, userRole, isAdmin, isContributor } = useAuth()

  // Role hierarchy: Admin > Family > Contributor
  const isFamily = userRole === 'family' || isAdmin

  return {
    // Basic authentication
    isAuthenticated: !!user,
    
    // Role-based permissions
    isAdmin,
    isContributor,
    isFamily,
    userRole,
    
    // Recipe permissions
    canCreateRecipe: isFamily,
    canEditRecipe: isFamily,
    canDeleteRecipe: isAdmin,
    
    // Category permissions
    canCreateCategory: isAdmin,
    canEditCategory: isAdmin,
    canDeleteCategory: isAdmin,
    
    // Document repository permissions
    canAccessDocuments: isFamily,
    canUploadDocuments: isFamily,
    canEditDocuments: isFamily,
    canDeleteDocuments: isFamily,
    canManageCategories: isAdmin,
    
    // Announcement permissions
    canCreateAnnouncement: isFamily,
    canEditAnnouncement: isFamily,
    canDeleteAnnouncement: isFamily,
    
    // Contact permissions
    canCreateContact: isFamily,
    canEditContact: isFamily,
    canDeleteContact: isFamily,
    
    // User management permissions
    canManageUsers: isAdmin,
    
    // Helper functions
    hasPermission: (permission) => {
      const permissions = {
        'create:recipe': isFamily,
        'edit:recipe': isFamily,
        'delete:recipe': isAdmin,
        'create:category': isAdmin,
        'edit:category': isAdmin,
        'delete:category': isAdmin,
        'access:documents': isFamily,
        'upload:documents': isFamily,
        'edit:documents': isFamily,
        'delete:documents': isFamily,
        'manage:categories': isAdmin,
        'create:announcement': isFamily,
        'edit:announcement': isFamily,
        'delete:announcement': isFamily,
        'create:contact': isFamily,
        'edit:contact': isFamily,
        'delete:contact': isFamily,
        'manage:users': isAdmin,
      }
      return permissions[permission] || false
    }
  }
}
