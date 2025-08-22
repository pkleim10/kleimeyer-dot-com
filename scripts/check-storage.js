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

async function checkStorage() {
  try {
    console.log('🔍 Checking storage setup...')
    
    // 1. List all storage buckets
    console.log('\n1. Checking storage buckets...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
    } else {
      console.log('✅ Storage buckets accessible')
      console.log('📋 Available buckets:')
      buckets.forEach(bucket => {
        console.log(`- ${bucket.name} (public: ${bucket.public})`)
      })
      
      const familyBucket = buckets.find(b => b.name === 'family-documents')
      if (familyBucket) {
        console.log('✅ family-documents bucket exists')
      } else {
        console.log('❌ family-documents bucket does not exist')
      }
    }

    // 2. Check if we can access the family-documents bucket
    console.log('\n2. Testing family-documents bucket access...')
    const { data: files, error: filesError } = await supabase.storage
      .from('family-documents')
      .list()

    if (filesError) {
      console.error('❌ Error accessing family-documents bucket:', filesError)
      console.log('💡 This suggests the bucket does not exist or has permission issues')
    } else {
      console.log('✅ family-documents bucket accessible')
      console.log(`📋 Files in bucket: ${files.length}`)
    }

    // 3. Check storage policies
    console.log('\n3. Checking storage policies...')
    const { data: policies, error: policiesError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_name', 'objects')
      .eq('table_schema', 'storage')

    if (policiesError) {
      console.error('❌ Error checking storage policies:', policiesError)
    } else {
      console.log('✅ Storage policies accessible')
      console.log('📋 Storage policies:')
      policies.forEach(policy => {
        console.log(`- ${policy.policy_name}: ${policy.permissive ? 'PERMISSIVE' : 'RESTRICTIVE'} ${policy.operation}`)
      })
    }

    // 4. Test document upload API directly
    console.log('\n4. Testing documents API endpoint...')
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/family_documents?select=*&limit=1`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      })
      
      if (response.ok) {
        console.log('✅ Documents API endpoint accessible')
      } else {
        console.log(`❌ Documents API endpoint error: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('❌ Error testing documents API:', error.message)
    }

    console.log('\n🎉 Storage check complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkStorage()
