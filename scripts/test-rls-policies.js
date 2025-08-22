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

async function testRLSPolicies() {
  try {
    console.log('🔍 Testing RLS policies...')
    
    // 1. Get all users and their roles
    console.log('\n1. Getting users and roles...')
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')

    if (rolesError) {
      console.error('❌ Error fetching user roles:', rolesError)
      return
    }

    console.log('📋 User roles:')
    userRoles.forEach(role => {
      console.log(`- User ${role.user_id}: ${role.role}`)
    })

    // 2. Test each user's access to documents table
    console.log('\n2. Testing document access for each user...')
    for (const userRole of userRoles) {
      console.log(`\n👤 Testing user ${userRole.user_id} (${userRole.role}):`)
      
      // Create a client with this user's context
      const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userRole.user_id)
      
      if (userError) {
        console.error(`❌ Error getting user:`, userError)
        continue
      }

      // Test documents access
      const { data: documents, error: docsError } = await supabase
        .from('family_documents')
        .select('*')
        .limit(1)

      if (docsError) {
        console.error(`❌ Documents access error:`, docsError.message)
      } else {
        console.log(`✅ Documents accessible (found ${documents.length} documents)`)
      }

      // Test categories access
      const { data: categories, error: catsError } = await supabase
        .from('document_categories')
        .select('*')
        .limit(1)

      if (catsError) {
        console.error(`❌ Categories access error:`, catsError.message)
      } else {
        console.log(`✅ Categories accessible (found ${categories.length} categories)`)
      }
    }

    console.log('\n🎉 RLS policy test complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testRLSPolicies()
