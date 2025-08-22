#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function restoreAdmin() {
  try {
    console.log('🔍 Fetching users...')
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return
    }

    console.log(`📋 Found ${users.users.length} users:`)
    users.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.id})`)
    })

    // Get current user roles
    console.log('\n🔍 Fetching current user roles...')
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError)
      return
    }

    console.log('📋 Current user roles:')
    userRoles.forEach(role => {
      const user = users.users.find(u => u.id === role.user_id)
      console.log(`- ${user?.email || 'Unknown'}: ${role.role}`)
    })

    // Restore admin role for the first user (typically the original admin)
    const firstUser = users.users[0]
    if (!firstUser) {
      console.error('❌ No users found')
      return
    }

    console.log(`\n🔄 Restoring admin role for ${firstUser.email}...`)
    
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', firstUser.id)

    if (updateError) {
      console.error(`❌ Error restoring admin role:`, updateError)
    } else {
      console.log(`✅ Restored admin role for ${firstUser.email}`)
    }

    // Also restore admin for itscosmo@gmail.com if present (as they were originally admin)
    const cosmosUser = users.users.find(u => u.email === 'itscosmo@gmail.com')
    if (cosmosUser && cosmosUser.id !== firstUser.id) {
      console.log(`\n🔄 Restoring admin role for ${cosmosUser.email}...`)
      
      const { error: updateError2 } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', cosmosUser.id)

      if (updateError2) {
        console.error(`❌ Error restoring admin role:`, updateError2)
      } else {
        console.log(`✅ Restored admin role for ${cosmosUser.email}`)
      }
    }

    console.log('\n🎉 Admin role restoration complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
restoreAdmin()
