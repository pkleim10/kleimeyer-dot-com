#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function assignFamilyRole() {
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
      console.log(`- ${role.user_id}: ${role.role}`)
    })

    // Find users who need family role (contributors only, preserve admins)
    const adminUsers = userRoles.filter(role => role.role === 'admin').map(role => role.user_id)
    const familyUsers = userRoles.filter(role => role.role === 'family').map(role => role.user_id)
    const contributorUsers = userRoles.filter(role => role.role === 'contributor').map(role => role.user_id)

    console.log(`\n📝 Role breakdown:`)
    console.log(`- Admins: ${adminUsers.length}`)
    console.log(`- Family: ${familyUsers.length}`)
    console.log(`- Contributors: ${contributorUsers.length}`)

    // Only convert contributors to family (preserve admins)
    const usersToConvertToFamily = users.users.filter(user => contributorUsers.includes(user.id))

    if (usersToConvertToFamily.length === 0) {
      console.log('✅ No contributors need to be converted to family role')
      return
    }

    console.log(`\n📝 Contributors to convert to family role:`)
    usersToConvertToFamily.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
    })

    // Ask for confirmation before making changes
    console.log('\n⚠️  This will convert contributors to family role (admins will be preserved)')
    
    // Convert contributors to family role
    console.log('\n🔄 Converting contributors to family role...')
    
    for (const user of usersToConvertToFamily) {
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: 'family' })
        .eq('user_id', user.id)

      if (updateError) {
        console.error(`❌ Error converting ${user.email} to family role:`, updateError)
      } else {
        console.log(`✅ Converted ${user.email} from contributor to family`)
      }
    }

    console.log('\n🎉 Family role assignment complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the script
assignFamilyRole()
