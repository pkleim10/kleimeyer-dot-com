import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isFamilyOrAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Get single document or download file
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'
    const preview = searchParams.get('preview') === 'true'

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    // Use admin client for storage and DB reads to bypass RLS, while keeping permission checks above
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get document details
    const { data: document, error } = await supabaseAdmin
      .from('family_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (download) {
      // Generate signed URL for download with admin client
      const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
        .from('family-documents')
        .createSignedUrl(document.file_path, 60) // 60 seconds expiry

      if (urlError) {
        console.error('Error generating signed URL:', urlError)
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
      }

      return NextResponse.json({ 
        document,
        downloadUrl: signedUrl.signedUrl 
      })
    }

    if (preview) {
      // Generate signed URL for preview with longer expiry
      const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
        .from('family-documents')
        .createSignedUrl(document.file_path, 3600) // 1 hour expiry for preview

      if (urlError) {
        console.error('Error generating preview URL:', urlError)
        return NextResponse.json({ error: 'Failed to generate preview link' }, { status: 500 })
      }

      return NextResponse.json({ 
        document,
        previewUrl: signedUrl.signedUrl 
      })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error in document GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update document metadata
export async function PUT(request, { params }) {
  try {
    const { id } = await params

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    const { user } = authResult

    // Get request body
    const body = await request.json()
    const { description, category, tags, album_id } = body

    // Update document
    const updateData = {
      description: description || null,
      category: category || 'general',
      tags: tags || [],
      updated_at: new Date().toISOString()
    }
    
    // Add album_id if provided
    if (album_id !== undefined) {
      updateData.album_id = album_id
    }
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('🔍 DEBUG: Updating document with ID:', id)
    console.log('🔍 DEBUG: Update data:', updateData)
    console.log('🔍 DEBUG: User ID:', user.id)
    
    const { data: document, error } = await supabaseAdmin
      .from('family_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()
    
    console.log('🔍 DEBUG: Update result:', { document, error })

    if (error) {
      console.error('Error updating document:', error)
      return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Error in document PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete document
export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    const { user } = authResult

    // Create admin client for storage and database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get document details first
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('family_documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('🗑️ DEBUG: Deleting document:', {
      id,
      file_path: document.file_path
    })

    // Delete from storage using admin client
    if (document.file_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from('family-documents')
        .remove([document.file_path])

      if (storageError) {
        console.error('Error deleting file from storage:', storageError)
        // Continue with database deletion even if storage deletion fails
      } else {
        console.log('✅ File deleted from storage:', document.file_path)
      }
    }

    // Delete from database using admin client
    const { error: deleteError } = await supabaseAdmin
      .from('family_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting document:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error in document DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
