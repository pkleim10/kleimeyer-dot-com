# Admin Setup Instructions

This document explains how to set up an admin user for the Kleimeyer.com application.

## Prerequisites

1. You must have a user account already created
2. You must have access to the Supabase dashboard
3. The user_roles table must be set up (run the migration scripts first)

## Step 1: Get Your User ID

There are several ways to get your user ID:

### Option A: From the Browser Console (Easiest)
1. Open your browser's developer tools (F12)
2. Go to the Console tab
3. Run this command:
   ```javascript
   // If you're logged in, this will show your user ID
   console.log('User ID:', window.supabase?.auth?.user()?.id)
   ```

### Option B: From the Application
1. Log into the application
2. The user ID is automatically logged to the console when you load any page
3. Check the browser console for a message like: "User ID from AuthContext: [your-user-id]"

### Option C: From Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to Authentication > Users
3. Find your user in the list
4. Copy the User ID

## Step 2: Set Admin Role

Once you have your user ID, you need to insert a record into the `user_roles` table.

### Using Supabase SQL Editor:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this SQL command (replace `YOUR_USER_ID` with your actual user ID):

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('YOUR_USER_ID', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Example:
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('ed03e845-8538-4efa-bed3-3671ed081bb0', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

## Step 3: Verify Admin Access

1. Refresh your application
2. You should now see an "Admin" link in the navigation bar
3. Click on "Admin" to access the admin panel
4. You should be able to see and manage user roles

## Step 4: Update Your Profile (Optional)

1. Click on "Profile" in the navigation bar
2. Update your first and last name
3. Save the changes
4. Your name should now appear correctly in the admin panel

## Troubleshooting

### "No records in user_roles table"
- This is normal for new users
- Use the `INSERT` command above, not `UPDATE`
- The `ON CONFLICT` clause ensures it works whether the user exists or not

### Admin link not appearing
- Make sure you refreshed the page after setting the role
- Check that the role was set to exactly 'admin' (lowercase)
- Verify the user ID is correct

### Permission errors
- Ensure the user_roles table exists and has the correct structure
- Check that RLS policies are properly configured
- Verify you're using the correct Supabase project

## Available Roles

- `admin`: Full access to admin panel and user management
- `contributor`: Can contribute content (future feature)
- `member`: Basic user access (default for new signups)

## Navigation

Once set up, you can access:
- **Profile**: `/profile` - Update your personal information
- **Admin Panel**: `/admin` - Manage users and roles (admin only)
- **Signup**: `/signup` - Create new accounts (for unauthenticated users)

All these pages are accessible through the navigation menu when appropriate.
