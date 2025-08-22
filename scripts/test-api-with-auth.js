#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAPIWithAuth() {
  try {
    console.log('🔍 Testing API with authentication...')
    
    // 1. Check if we can get a session
    console.log('\n1. Checking session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('❌ Session error:', sessionError)
      return
    }

    if (!session) {
      console.log('⚠️ No active session found')
      console.log('💡 You need to be logged in to test the API')
      return
    }

    console.log('✅ Active session found')
    console.log('👤 User ID:', session.user.id)
    console.log('📧 User email:', session.user.email)

    // 2. Test user role directly
    console.log('\n2. Testing user role directly...')
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single()

    if (roleError) {
      console.error('❌ Role check error:', roleError)
    } else if (!userRole) {
      console.log('⚠️ No role found for user')
    } else {
      console.log('✅ User role found:', userRole.role)
    }

    // 3. Test documents table access
    console.log('\n3. Testing documents table access...')
    const { data: documents, error: docsError } = await supabase
      .from('family_documents')
      .select('*')
      .limit(5)

    if (docsError) {
      console.error('❌ Documents table error:', docsError)
    } else {
      console.log('✅ Documents table accessible')
      console.log('📋 Documents count:', documents.length)
    }

    // 4. Test categories table access
    console.log('\n4. Testing categories table access...')
    const { data: categories, error: catsError } = await supabase
      .from('document_categories')
      .select('*')
      .limit(5)

    if (catsError) {
      console.error('❌ Categories table error:', catsError)
    } else {
      console.log('✅ Categories table accessible')
      console.log('📋 Categories count:', categories.length)
    }

    // 5. Test storage access
    console.log('\n5. Testing storage access...')
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('family-documents')
      .list('', { limit: 5 })

    if (storageError) {
      console.error('❌ Storage error:', storageError)
    } else {
      console.log('✅ Storage accessible')
      console.log('📋 Storage files count:', storageFiles.length)
    }

    console.log('\n🎉 API test complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testAPIWithAuth()
