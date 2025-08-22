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
    canCreateRecipe: isContributor,
    canEditRecipe: isContributor,
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
    
    // User management permissions
    canManageUsers: isAdmin,
    
    // Helper functions
    hasPermission: (permission) => {
      const permissions = {
        'create:recipe': isContributor,
        'edit:recipe': isContributor,
        'delete:recipe': isAdmin,
        'create:category': isAdmin,
        'edit:category': isAdmin,
        'delete:category': isAdmin,
        'access:documents': isFamily,
        'upload:documents': isFamily,
        'edit:documents': isFamily,
        'delete:documents': isFamily,
        'manage:categories': isAdmin,
        'manage:users': isAdmin,
      }
      return permissions[permission] || false
    }
  }
}
