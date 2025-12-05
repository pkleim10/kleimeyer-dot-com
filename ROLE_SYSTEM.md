# Role-Based Access Control System

## Overview

This system uses a simple 3-role structure for access control. All access is role-based with no CRUD-level permissions. The system supports unauthenticated users as an implicit role.

## Roles

### Unauthenticated (Implicit)
- No login required
- Treated as implicit role
- **Access**: View recipes and recipe categories only

### Member (Default)
- Default role for all authenticated users
- **Access**: 
  - View recipes (in addition to unauthenticated access)
  - Profile management
  - Personal medication lists (own lists only)

### Family
- Access to family features + recipe editing
- **Access**:
  - All Member access
  - Recipe Add/Edit/Delete
  - Recipe Categories Add/Edit/Delete
  - Family Business (announcements, contacts, documents, calendar)
  - Photo Albums
  - Shared medication lists

### Admin
- Full system access + user role management
- **Access**:
  - All Family access
  - Admin panel (user role management)
  - Document Categories management (Admin only)

## Access Rules Summary

### Unauthenticated Users Only
- View recipes
- View recipe categories
- No other access

### All Authenticated Users (Member, Family, Admin)
- View recipes (in addition to unauthenticated access)
- Profile management
- Personal medication lists (own lists only)

### Family or Admin Only
- Recipe Add/Edit/Delete
- Recipe Categories Add/Edit/Delete
- Family Business (announcements, contacts, documents, calendar)
- Photo Albums
- Shared medication lists

### Admin Only
- Admin panel (user role management)
- Document Categories management

### User-Specific
- Personal medication lists: Only accessible by the user who created them

## Database Structure

### user_roles Table
```sql
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('member', 'family', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Helper Functions
- `get_user_role(user_uuid UUID)` - Returns role string or NULL for unauthenticated
- `is_user_admin(user_uuid UUID)` - Returns true if user is admin
- `is_family_or_admin(user_uuid UUID)` - Returns true if user is family or admin
- `is_family(user_uuid UUID)` - Returns true if user is family

## Frontend Usage

### usePermissions Hook
```javascript
const {
  // Role checks
  role, // 'member', 'family', 'admin', or null
  isMember,
  isFamily,
  isAdmin,
  isAuthenticated,
  
  // Permission checks (role-based)
  canViewRecipes, // true for everyone
  canCreateRecipe, // Family or Admin
  canEditRecipe, // Family or Admin
  canDeleteRecipe, // Family or Admin
  canManageCategories, // Family or Admin
  canViewFamily, // Family or Admin
  canManageUsers, // Admin only
  canViewSharedMedications, // Family or Admin
  // ... etc
} = usePermissions()
```

## API Route Usage

### Role Check Utilities
```javascript
import { isAdmin, isFamilyOrAdmin, verifyAuth } from '@/utils/roleChecks'

// Verify authentication
const authResult = await verifyAuth(token)
if (!authResult) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// Check role
if (!(await isFamilyOrAdmin(token))) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## RLS Policies

All RLS policies use role-based checks via helper functions:

- **Recipes**: View (all users), Add/Edit/Delete (Family or Admin)
- **Recipe Categories**: View (all users), Add/Edit/Delete (Family or Admin)
- **Family Bulletins**: All operations (Family or Admin, authenticated only)
- **Family Contacts**: All operations (Family or Admin, authenticated only)
- **Family Documents**: All operations (Family or Admin, authenticated only)
- **Document Categories**: View (Family or Admin), Manage (Admin only)
- **Medications**: 
  - Shared groups: Family or Admin (authenticated only)
  - Personal groups: User who created them (authenticated only)
- **Photo Albums**: All operations (Family or Admin, authenticated only)
- **Admin panel**: Admin only (authenticated only)

## Migration Notes

The system was migrated from a granular permission-based system to this simple role-based system. The `user_permissions` table is kept for backward compatibility but is no longer used for access control.

