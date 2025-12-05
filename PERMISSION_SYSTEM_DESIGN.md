# Multi-Role Permission System Design (DEPRECATED)

## ⚠️ ARCHIVED - This system has been replaced

**This document is archived for historical reference only.**

The system has been simplified to a 3-role system (Member, Family, Admin). See `ROLE_SYSTEM.md` for the current system documentation.

---

## Overview (Historical)

This document outlined the transition from a hierarchical single-role system to a flexible multi-role permission system.

## Current System Issues

### Problems with Hierarchical Roles
- **admin > family > contributor > member** hierarchy is rigid
- Single role per user limits flexibility
- Hard to grant specific permissions without giving full role access
- Difficult to create custom permission combinations

### Current Role Structure
```sql
-- Single role per user
user_roles: user_id (UNIQUE), role (admin|contributor|family|member)
```

## New Multi-Role System

### Core Concept
- **Users can have multiple permissions**
- **Each permission is granular and specific**
- **RLS policies check for specific permissions, not roles**
- **Backward compatibility maintained**

### Database Schema

#### New Table: `user_permissions`
```sql
user_permissions:
  - id (UUID, Primary Key)
  - user_id (UUID, Foreign Key to auth.users)
  - permission (VARCHAR(100), Specific permission name)
  - created_at (TIMESTAMP)
  - UNIQUE(user_id, permission)
```

#### Permission Categories

##### 1. Admin Permissions
- `admin:full_access` - Complete system access
- `admin:manage_users` - User management
- `admin:manage_roles` - Role/permission management
- `admin:system_settings` - System configuration

##### 2. Family Permissions
- `family:full_access` - All family features
- `family:view_bulletins` - View announcements
- `family:create_bulletins` - Create announcements
- `family:edit_bulletins` - Edit announcements
- `family:delete_bulletins` - Delete announcements
- `family:view_contacts` - View family contacts
- `family:manage_contacts` - Manage family contacts
- `family:view_documents` - View family documents
- `family:upload_documents` - Upload documents
- `family:manage_documents` - Full document management

##### 3. Recipe Permissions
- `recipe:view_recipes` - View recipes
- `recipe:create_recipes` - Create recipes
- `recipe:edit_recipes` - Edit recipes
- `recipe:delete_recipes` - Delete recipes
- `recipe:manage_categories` - Manage recipe categories

##### 4. Basic Permissions
- `member:basic_access` - Basic authenticated access
- `member:view_profile` - View own profile
- `member:edit_profile` - Edit own profile

### Permission Functions

#### Core Permission Check
```sql
has_permission(user_uuid, permission_name) -> BOOLEAN
```

#### Specific Permission Functions
```sql
can_access_family_bulletins(user_uuid) -> BOOLEAN
can_create_family_bulletins(user_uuid) -> BOOLEAN
can_edit_family_bulletins(user_uuid) -> BOOLEAN
can_delete_family_bulletins(user_uuid) -> BOOLEAN
```

### RLS Policy Examples

#### Before (Role-based)
```sql
CREATE POLICY "Family can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('contributor', 'admin', 'family')
    )
  );
```

#### After (Permission-based)
```sql
CREATE POLICY "Users with create permission can create bulletins" ON family_bulletins
  FOR INSERT WITH CHECK (
    can_create_family_bulletins(auth.uid())
  );
```

### Frontend Permission System

#### New usePermissions Hook Structure
```javascript
const {
  // Permission checks
  hasPermission: (permission) => boolean,
  canCreateAnnouncement: boolean,
  canEditAnnouncement: boolean,
  canDeleteAnnouncement: boolean,
  
  // Role compatibility (for backward compatibility)
  isAdmin: boolean,
  isFamily: boolean,
  isContributor: boolean,
  
  // User info
  user: User,
  permissions: string[]
} = usePermissions()
```

### Migration Strategy

#### Phase 1: Database Migration
1. Create `user_permissions` table
2. Migrate existing roles to permissions
3. Create permission-checking functions
4. Update RLS policies

#### Phase 2: Backend Updates
1. Update API routes to use permission functions
2. Create permission management endpoints
3. Update authentication context

#### Phase 3: Frontend Updates
1. Update `usePermissions` hook
2. Update components to use new permission system
3. Create permission management UI

#### Phase 4: Cleanup
1. Remove old role-based code
2. Update documentation
3. Test all permission scenarios

### Benefits

#### Flexibility
- Grant specific permissions without full role access
- Create custom permission combinations
- Easy to add new permissions

#### Scalability
- No role hierarchy limitations
- Easy to add new features with specific permissions
- Better separation of concerns

#### Maintainability
- Clear permission definitions
- Easier to audit permissions
- Simpler permission logic

### Example Permission Scenarios

#### Scenario 1: Read-Only Family Member
```sql
-- User can view but not modify family content
INSERT INTO user_permissions (user_id, permission) VALUES
  (user_id, 'family:view_bulletins'),
  (user_id, 'family:view_contacts'),
  (user_id, 'family:view_documents');
```

#### Scenario 2: Recipe Contributor
```sql
-- User can manage recipes but not family content
INSERT INTO user_permissions (user_id, permission) VALUES
  (user_id, 'recipe:view_recipes'),
  (user_id, 'recipe:create_recipes'),
  (user_id, 'recipe:edit_recipes');
```

#### Scenario 3: Document Manager
```sql
-- User can manage documents but not other family content
INSERT INTO user_permissions (user_id, permission) VALUES
  (user_id, 'family:view_documents'),
  (user_id, 'family:upload_documents'),
  (user_id, 'family:manage_documents');
```

### Backward Compatibility

The old `user_roles` table is maintained for backward compatibility. The system can check both:
1. New permission system (preferred)
2. Legacy role system (fallback)

This ensures existing functionality continues to work during the transition.
