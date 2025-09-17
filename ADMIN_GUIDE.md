# Administrator Guide - Multi-Role Permission System

## Overview

The new multi-role permission system provides granular control over user access. Instead of rigid hierarchical roles, administrators can now grant specific permissions to users, allowing for more flexible and precise access control.

## Accessing the Admin Panel

1. **Navigate to Admin Panel**: Go to `/admin` in your browser
2. **Authentication Required**: You must have `admin:full_access` or `admin:manage_users` permission
3. **User Management**: The admin panel shows all users with their current permissions

## User Management Interface

### User List View
- **User Information**: Name, email, and join date
- **Legacy Role**: Shows the old role system for reference
- **Permission Summary**: Displays a summary of current permissions
- **Manage Permissions Button**: Opens the detailed permission editor

### Permission Management Modal

#### Quick Presets
Use these buttons to quickly apply common permission sets:

- **Admin**: Full system access (all permissions)
- **Family**: Family features + basic recipe access
- **Contributor**: Recipe management only
- **Member**: Basic access only

#### Granular Permissions

##### Admin Permissions
- **Full Admin Access**: Complete system control
- **Manage Users**: Add, edit, and remove users
- **Manage Permissions**: Grant and revoke permissions
- **System Settings**: Configure system settings

##### Family Permissions
- **Full Family Access**: All family features
- **View Announcements**: Read family announcements
- **Create Announcements**: Add new announcements
- **Edit Announcements**: Modify existing announcements
- **Delete Announcements**: Remove announcements
- **View Contacts**: See family contacts
- **Manage Contacts**: Add, edit, and delete contacts
- **View Documents**: Access family documents
- **Upload Documents**: Add new documents
- **Manage Documents**: Full document control

##### Recipe Permissions
- **View Recipes**: Access recipe collection
- **Create Recipes**: Add new recipes
- **Edit Recipes**: Modify existing recipes
- **Delete Recipes**: Remove recipes
- **Manage Categories**: Organize recipe categories

##### Member Permissions
- **Basic Access**: Authenticated user access
- **View Profile**: See own profile
- **Edit Profile**: Update own information

## Best Practices

### Permission Assignment Strategy

#### 1. Start with Presets
- Use the preset buttons for common roles
- Customize individual permissions as needed

#### 2. Principle of Least Privilege
- Grant only the permissions users need
- Regularly review and audit permissions
- Remove unused permissions

#### 3. Common Permission Combinations

**Read-Only Family Member:**
```
family:view_bulletins
family:view_contacts
family:view_documents
member:basic_access
member:view_profile
member:edit_profile
```

**Recipe Contributor:**
```
recipe:view_recipes
recipe:create_recipes
recipe:edit_recipes
member:basic_access
member:view_profile
member:edit_profile
```

**Document Manager:**
```
family:view_documents
family:upload_documents
family:manage_documents
member:basic_access
member:view_profile
member:edit_profile
```

**Limited Family Access:**
```
family:view_bulletins
family:create_bulletins
family:view_contacts
member:basic_access
member:view_profile
member:edit_profile
```

### Security Considerations

#### 1. Admin Access
- Only grant `admin:full_access` to trusted users
- Consider using specific admin permissions instead of full access
- Regularly audit admin permissions

#### 2. Permission Inheritance
- `admin:full_access` includes all other permissions
- `family:full_access` includes all family permissions
- Use specific permissions when full access isn't needed

#### 3. User Self-Management
- Users cannot modify their own permissions
- Users can only view their own permissions
- All permission changes require admin access

## Migration from Legacy Roles

### Current State
- Legacy roles are still visible for reference
- New permissions are active and take precedence
- Both systems work together during transition

### Migration Process
1. **Review Current Users**: Check existing role assignments
2. **Apply New Permissions**: Use presets or custom permissions
3. **Test Access**: Verify users can access expected features
4. **Monitor Usage**: Watch for permission-related issues

### Legacy Role Mapping
- **Admin** → `admin:full_access` + all other permissions
- **Family** → `family:full_access` + recipe + member permissions
- **Contributor** → `recipe:*` + member permissions
- **Member** → `member:*` permissions only

## Troubleshooting

### Common Issues

#### 1. User Can't Access Features
- Check if user has required permissions
- Verify permission names are correct
- Check for typos in permission assignments

#### 2. Permission Changes Not Taking Effect
- Refresh the page after making changes
- Check if user is logged out and back in
- Verify API calls are successful

#### 3. Admin Panel Access Denied
- Ensure you have `admin:full_access` or `admin:manage_users`
- Check if your session is valid
- Verify you're using the correct account

### Debugging Steps
1. **Check User Permissions**: Use the permission summary in user list
2. **Review API Logs**: Check browser console for errors
3. **Test with Presets**: Try applying a preset to isolate issues
4. **Verify Database**: Check `user_permissions` table directly

## API Reference

### Permission Management Endpoints

#### Get User Permissions
```
GET /api/admin/permissions?userId={userId}
Authorization: Bearer {token}
```

#### Grant Permission
```
POST /api/admin/permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-uuid",
  "permission": "permission:name"
}
```

#### Revoke Permission
```
DELETE /api/admin/permissions?userId={userId}&permission={permission}
Authorization: Bearer {token}
```

### Permission Names
All permissions follow the pattern: `category:action`

- **Admin**: `admin:full_access`, `admin:manage_users`, `admin:manage_roles`, `admin:system_settings`
- **Family**: `family:full_access`, `family:view_bulletins`, `family:create_bulletins`, etc.
- **Recipe**: `recipe:view_recipes`, `recipe:create_recipes`, `recipe:edit_recipes`, etc.
- **Member**: `member:basic_access`, `member:view_profile`, `member:edit_profile`

## Support

For issues or questions about the permission system:
1. Check this guide first
2. Review the permission system design document
3. Test with the admin panel interface
4. Contact system administrator if needed

The new permission system provides much more flexibility than the old role system while maintaining security and ease of use.
