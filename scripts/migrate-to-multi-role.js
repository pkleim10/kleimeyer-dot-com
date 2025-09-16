require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateToMultiRole() {
  try {
    console.log('Starting migration to multi-role system...')
    
    // Step 1: Check if user_permissions table exists by trying to query it
    const { data: testQuery, error: tableError } = await supabase
      .from('user_permissions')
      .select('id')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      console.log('❌ user_permissions table does not exist!')
      console.log('Please run the migration SQL first: migrations/refactor_to_multi_role_system.sql')
      return
    }

    if (tableError) {
      console.error('Error checking user_permissions table:', tableError)
      return
    }

    console.log('✅ user_permissions table exists')

    // Step 2: Get all current users and their roles
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id, role')

    if (roleError) {
      console.error('Error fetching user roles:', roleError)
      return
    }

    console.log(`Found ${userRoles.length} users with roles`)

    // Step 3: Check if permissions already exist
    const { data: existingPermissions, error: permError } = await supabase
      .from('user_permissions')
      .select('user_id, permission')

    if (permError) {
      console.error('Error fetching existing permissions:', permError)
      return
    }

    if (existingPermissions.length > 0) {
      console.log(`⚠️  Found ${existingPermissions.length} existing permissions`)
      console.log('Migration may have already been run. Skipping...')
      return
    }

    // Step 4: Migrate each user's role to permissions
    const permissionMappings = {
      'admin': [
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
      ],
      'family': [
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
      ],
      'contributor': [
        'recipe:view_recipes',
        'recipe:create_recipes',
        'recipe:edit_recipes',
        'member:basic_access',
        'member:view_profile',
        'member:edit_profile'
      ],
      'member': [
        'member:basic_access',
        'member:view_profile',
        'member:edit_profile'
      ]
    }

    let migratedCount = 0
    let errorCount = 0

    for (const userRole of userRoles) {
      const permissions = permissionMappings[userRole.role] || permissionMappings['member']
      
      console.log(`Migrating user ${userRole.user_id} (${userRole.role}) with ${permissions.length} permissions`)
      
      try {
        // Insert all permissions for this user
        const permissionInserts = permissions.map(permission => ({
          user_id: userRole.user_id,
          permission
        }))

        const { error: insertError } = await supabase
          .from('user_permissions')
          .insert(permissionInserts)

        if (insertError) {
          console.error(`Error migrating user ${userRole.user_id}:`, insertError)
          errorCount++
        } else {
          migratedCount++
          console.log(`✅ Migrated user ${userRole.user_id}`)
        }
      } catch (err) {
        console.error(`Error migrating user ${userRole.user_id}:`, err)
        errorCount++
      }
    }

    console.log('\n🎉 Migration completed!')
    console.log(`✅ Successfully migrated: ${migratedCount} users`)
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} users`)
    }

    // Step 5: Verify migration
    const { data: finalPermissions, error: finalError } = await supabase
      .from('user_permissions')
      .select('user_id, permission')

    if (finalError) {
      console.error('Error verifying migration:', finalError)
    } else {
      console.log(`📊 Total permissions created: ${finalPermissions.length}`)
      
      // Group by user
      const userPermissionCounts = {}
      finalPermissions.forEach(p => {
        userPermissionCounts[p.user_id] = (userPermissionCounts[p.user_id] || 0) + 1
      })
      
      console.log('📋 Permissions per user:')
      Object.entries(userPermissionCounts).forEach(([userId, count]) => {
        console.log(`  ${userId}: ${count} permissions`)
      })
    }

  } catch (error) {
    console.error('Migration failed:', error)
  }
}

migrateToMultiRole()
