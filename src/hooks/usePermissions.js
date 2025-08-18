import { useAuth } from '@/contexts/AuthContext'

export const usePermissions = () => {
  const { user, userRole, isAdmin, isContributor } = useAuth()

  return {
    // Basic authentication
    isAuthenticated: !!user,
    
    // Role-based permissions
    isAdmin,
    isContributor,
    userRole,
    
    // Recipe permissions
    canCreateRecipe: isContributor,
    canEditRecipe: isContributor,
    canDeleteRecipe: isAdmin,
    
    // Category permissions
    canCreateCategory: isAdmin,
    canEditCategory: isAdmin,
    canDeleteCategory: isAdmin,
    
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
        'manage:users': isAdmin,
      }
      return permissions[permission] || false
    }
  }
}
