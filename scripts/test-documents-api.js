#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Load environment variables from .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDocumentsAPI() {
  try {
    console.log('🔍 Testing documents API...')
    
    // 1. Check if user_roles table exists
    console.log('\n1. Checking user_roles table...')
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(5)

    if (rolesError) {
      console.error('❌ Error accessing user_roles table:', rolesError)
    } else {
      console.log('✅ user_roles table accessible')
      console.log('📋 Current user roles:', userRoles)
    }

    // 2. Check if family_documents table exists
    console.log('\n2. Checking family_documents table...')
    const { data: documents, error: docsError } = await supabase
      .from('family_documents')
      .select('*')
      .limit(5)

    if (docsError) {
      console.error('❌ Error accessing family_documents table:', docsError)
    } else {
      console.log('✅ family_documents table accessible')
      console.log('📋 Current documents:', documents)
    }

    // 3. Check if document_categories table exists
    console.log('\n3. Checking document_categories table...')
    const { data: categories, error: catsError } = await supabase
      .from('document_categories')
      .select('*')
      .limit(5)

    if (catsError) {
      console.error('❌ Error accessing document_categories table:', catsError)
    } else {
      console.log('✅ document_categories table accessible')
      console.log('📋 Current categories:', categories)
    }

    // 4. Check current user session
    console.log('\n4. Checking current user session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('❌ Error getting session:', sessionError)
    } else if (!session) {
      console.log('⚠️ No active session found')
    } else {
      console.log('✅ Active session found')
      console.log('👤 User ID:', session.user.id)
      console.log('📧 User email:', session.user.email)
    }

    // 5. Check user role for current user
    if (session) {
      console.log('\n5. Checking user role for current user...')
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (roleError) {
        console.error('❌ Error checking user role:', roleError)
      } else if (!userRole) {
        console.log('⚠️ No role found for current user')
      } else {
        console.log('✅ User role found:', userRole.role)
      }
    }

    console.log('\n🎉 API test complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testDocumentsAPI()
