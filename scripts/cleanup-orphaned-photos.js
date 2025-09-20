#!/usr/bin/env node

/**
 * Cleanup Orphaned Photos Script
 * 
 * This script identifies and removes photos from Supabase Storage that are no longer
 * referenced in the family_documents table (orphaned files).
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupOrphanedPhotos() {
  try {
    console.log('🔍 Starting orphaned photos cleanup...')
    
    // Get all file paths from the database
    console.log('📊 Fetching database records...')
    const { data: documents, error: dbError } = await supabase
      .from('family_documents')
      .select('file_path')
      .eq('file_type', 'image')
      .not('file_path', 'is', null)

    if (dbError) {
      console.error('❌ Error fetching documents:', dbError)
      return
    }

    const validFilePaths = new Set(documents.map(doc => doc.file_path))
    console.log(`📋 Found ${validFilePaths.size} valid image files in database`)

    // List all files in storage
    console.log('🗂️  Listing all files in storage...')
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('family-documents')
      .list('documents/photos', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (storageError) {
      console.error('❌ Error listing storage files:', storageError)
      return
    }

    console.log(`📁 Found ${storageFiles.length} files in storage`)

    // Find orphaned files
    const orphanedFiles = storageFiles.filter(file => {
      const fullPath = `documents/photos/${file.name}`
      return !validFilePaths.has(fullPath)
    })

    console.log(`🗑️  Found ${orphanedFiles.length} orphaned files:`)
    orphanedFiles.forEach(file => {
      console.log(`   - documents/photos/${file.name} (${file.metadata?.size || 'unknown size'})`)
    })

    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found!')
      return
    }

    // Calculate total size to be freed
    const totalSize = orphanedFiles.reduce((sum, file) => {
      return sum + (file.metadata?.size || 0)
    }, 0)

    console.log(`💾 Total size to be freed: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)

    // Ask for confirmation
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    const answer = await new Promise(resolve => {
      rl.question(`\n❓ Delete ${orphanedFiles.length} orphaned files? (y/N): `, resolve)
    })
    rl.close()

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Cleanup cancelled')
      return
    }

    // Delete orphaned files
    console.log('\n🗑️  Deleting orphaned files...')
    const filesToDelete = orphanedFiles.map(file => `documents/photos/${file.name}`)
    
    const { data: deleteResult, error: deleteError } = await supabase.storage
      .from('family-documents')
      .remove(filesToDelete)

    if (deleteError) {
      console.error('❌ Error deleting files:', deleteError)
      return
    }

    console.log(`✅ Successfully deleted ${deleteResult.length} orphaned files`)
    console.log(`💾 Freed approximately ${(totalSize / 1024 / 1024).toFixed(2)} MB of storage`)

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the cleanup
cleanupOrphanedPhotos()
  .then(() => {
    console.log('\n🎉 Cleanup completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  })
