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

async function checkSampleData() {
  try {
    console.log('🔍 Checking sample data with service role...')
    
    // Check documents table
    console.log('\n1. Checking family_documents table...')
    const { data: documents, error: docsError } = await supabase
      .from('family_documents')
      .select('*')

    if (docsError) {
      console.error('❌ Error fetching documents:', docsError)
    } else {
      console.log('✅ Documents table accessible')
      console.log(`📋 Found ${documents.length} documents:`)
      documents.forEach(doc => {
        console.log(`  - ${doc.original_filename} (${doc.file_path})`)
      })
    }

    // Check categories table
    console.log('\n2. Checking document_categories table...')
    const { data: categories, error: catsError } = await supabase
      .from('document_categories')
      .select('*')

    if (catsError) {
      console.error('❌ Error fetching categories:', catsError)
    } else {
      console.log('✅ Categories table accessible')
      console.log(`📋 Found ${categories.length} categories:`)
      categories.forEach(cat => {
        console.log(`  - ${cat.name}: ${cat.description}`)
      })
    }

    // Check storage bucket
    console.log('\n3. Checking storage bucket...')
    const { data: storageFiles, error: storageError } = await supabase
      .storage
      .from('family-documents')
      .list('', { limit: 100 })

    if (storageError) {
      console.error('❌ Error accessing storage:', storageError)
    } else {
      console.log('✅ Storage bucket accessible')
      console.log(`📋 Found ${storageFiles.length} files in storage:`)
      storageFiles.forEach(file => {
        console.log(`  - ${file.name} (${file.metadata?.size || 'unknown size'})`)
      })
    }

    console.log('\n🎉 Sample data check complete!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the check
checkSampleData()
