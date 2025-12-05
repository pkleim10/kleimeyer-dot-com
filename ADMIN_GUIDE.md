# Administrator Guide - Role-Based Access Control

## Overview

The system uses a simple 3-role structure for access control. All access is role-based with no CRUD-level permissions. Administrators can assign roles to users through the admin panel.

## Accessing the Admin Panel

1. **Navigate to Admin Panel**: Go to `/admin` in your browser
2. **Authentication Required**: You must have the `admin` role
3. **User Management**: The admin panel shows all users with their current roles

## User Management Interface

### User List View
- **User Information**: Name, email, and join date
- **Role Badge**: Displays the user's current role (Member, Family, or Admin)
- **Manage Role Button**: Opens the role assignment modal
- **Delete Account Button**: Permanently removes a user account

### Role Management Modal

#### Available Roles

**Member** (Default)
- Basic authenticated access
- View recipes
- Profile management
- Personal medication lists (own lists only)

**Family**
- All Member access
- Recipe Add/Edit/Delete
- Recipe Categories Add/Edit/Delete
- Family Business (announcements, contacts, documents, calendar)
- Photo Albums
- Shared medication lists

**Admin**
- All Family access
- Admin panel (user role management)
- Document Categories management

#### Assigning Roles

1. Click "Manage Role" next to a user
2. Select the desired role (Member, Family, or Admin)
3. Click "Save Role"
4. The user's access will be updated immediately

## Best Practices

### Role Assignment Strategy

#### 1. Default to Member
- New users automatically get the `member` role
- Only promote to Family or Admin when needed

#### 2. Principle of Least Privilege
- Grant only the access level users need
- Regularly review user roles
- Demote users who no longer need elevated access

#### 3. Common Role Assignments

**Family Members:**
- Assign `family` role for access to family features
- Allows recipe editing and family business access

**Administrators:**
- Assign `admin` role for full system access
- Use sparingly - only for trusted users who need system management

**Regular Users:**
- Keep as `member` for basic access
- Can view recipes and manage their own profile

## Access Control Summary

### Unauthenticated Users
- Can view recipes
- Can view recipe categories
- No other access

### Member Role
- All unauthenticated access
- Profile management
- Personal medication lists

### Family Role
- All Member access
- Recipe editing
- Family Business features
- Photo Albums
- Shared medication lists

### Admin Role
- All Family access
- User role management
- Document Categories management

## Troubleshooting

### User Cannot Access Feature
1. Check their role in the admin panel
2. Verify the feature requires Family or Admin access
3. Update their role if needed

### User Has Too Much Access
1. Review their current role
2. Demote to appropriate role (Member or Family)
3. Changes take effect immediately

### Cannot Access Admin Panel
- You must have the `admin` role
- Contact an existing admin to assign the role
- Or use SQL to set role directly in database

## Technical Details

### Database Structure
- Roles are stored in the `user_roles` table
- Each user has exactly one role
- Default role is `member` if not specified

### Role Assignment via SQL
```sql
-- Assign admin role
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Assign family role
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'family')
ON CONFLICT (user_id) DO UPDATE SET role = 'family';

-- Assign member role (or remove elevated access)
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'member')
ON CONFLICT (user_id) DO UPDATE SET role = 'member';
```

## Migration Notes

The system was migrated from a granular permission-based system to this simple role-based system. The old `user_permissions` table is kept for backward compatibility but is no longer used for access control.
