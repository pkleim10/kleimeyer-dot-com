import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// GET - Fetch documents with optional filters
export async function GET(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's token
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user has permission to view documents
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError) {
      console.error('Error fetching user permissions:', permError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    const hasPermission = userPermissions?.some(p => 
      p.permission === 'admin:full_access' || 
      p.permission === 'family:full_access' || 
      p.permission === 'family:view_documents'
    )

    if (!hasPermission) {
      console.log('Access denied - no document view permission for user:', user.id)
      return NextResponse.json({ error: 'Access denied - family access required' }, { status: 403 })
    }

    console.log('User has document view permission')

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const fileType = searchParams.get('fileType')
    const albumId = searchParams.get('albumId')
    const limit = parseInt(searchParams.get('limit')) || 50
    const offset = parseInt(searchParams.get('offset')) || 0

    // Build query using admin client to bypass RLS
    let query = supabaseAdmin
      .from('family_documents')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (category && category !== 'all') {
      // Special case: when looking for photos in an album, don't filter by category
      // because photos might have different categories after editing
      if (!albumId) {
        query = query.eq('category', category)
      }
    }

    if (fileType && fileType !== 'all') {
      query = query.eq('file_type', fileType)
    }

    if (albumId) {
      // When requesting specific album photos, include only that album
      query = query.eq('album_id', albumId)
    } else {
      // When not requesting album photos, exclude all photos that belong to albums
      query = query.is('album_id', null)
    }

    if (search) {
      const safeSearch = search.replace(/[,]/g, '')
      query = query.or(`original_filename.ilike.*${safeSearch}*,description.ilike.*${safeSearch}*`)
    }

    const { data: documents, error } = await query

    console.log('🔍 DEBUG: Documents query result:', { 
      documents: documents?.length || 0, 
      error,
      albumId,
      category,
      search
    })
    
    if (documents && documents.length > 0) {
      console.log('🔍 DEBUG: First document:', {
        id: documents[0].id,
        original_filename: documents[0].original_filename,
        album_id: documents[0].album_id,
        category: documents[0].category
      })
    }

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents: ' + error.message }, { status: 500 })
    }

    // For images, attach a short-lived signed URL for previewing
    const documentsWithUrls = await Promise.all((documents || []).map(async (doc) => {
      if (doc.file_type === 'image' && doc.file_path) {
        try {
          const { data: signed, error: signedErr } = await supabaseAdmin
            .storage
            .from('family-documents')
            .createSignedUrl(doc.file_path, 3600) // 1 hour
          if (!signedErr && signed?.signedUrl) {
            return { ...doc, preview_url: signed.signedUrl }
          }
        } catch (_) {}
      }
      return doc
    }))

    return NextResponse.json({ documents: documentsWithUrls })
  } catch (error) {
    console.error('Error in documents GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Upload new document
export async function POST(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Create a client with the user's token
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    })

    // Verify the user's session
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user has permission to upload documents
    const { data: userPermissions, error: permError } = await supabaseWithAuth
      .from('user_permissions')
      .select('permission')
      .eq('user_id', user.id)

    if (permError) {
      console.error('Error fetching user permissions:', permError)
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })
    }

    const hasPermission = userPermissions?.some(p => 
      p.permission === 'admin:full_access' || 
      p.permission === 'family:full_access' || 
      p.permission === 'family:upload_documents'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - upload permission required' }, { status: 403 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file')
    const description = formData.get('description') || ''
    const category = formData.get('category') || 'general'
    const tags = formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()) : []
    const albumIdForm = formData.get('albumId') || null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop()
    const filename = `${timestamp}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    const filePath = `documents/${category}/${filename}`

    // Create admin client for database and storage operations with proper configuration
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Upload file to Supabase Storage using admin client to bypass Storage RLS
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('family-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file: ' + uploadError.message }, { status: 500 })
    }

    // Get file type category
    const fileType = file.type.startsWith('image/') ? 'image' : 
                    file.type === 'application/pdf' ? 'pdf' :
                    file.type.includes('word') ? 'document' :
                    file.type.includes('excel') ? 'spreadsheet' : 'other'

    // Insert document record using admin client to bypass RLS
    const { data: document, error: insertError } = await supabaseAdmin
      .from('family_documents')
      .insert({
        filename,
        original_filename: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: fileType,
        mime_type: file.type,
        category,
        album_id: albumIdForm,
        created_by: user.id,
        description,
        tags
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting document:', insertError)
      // Clean up uploaded file if database insert fails
      await supabaseAdmin.storage.from('family-documents').remove([filePath])
      return NextResponse.json({ error: 'Failed to save document record' }, { status: 500 })
    }

    // If this is an image uploaded to an album, check if it should be the cover image
    if (albumIdForm && fileType === 'image') {
      try {
        // Check if the album already has a cover image
        const { data: album, error: albumError } = await supabaseAdmin
          .from('photo_albums')
          .select('cover_image_id')
          .eq('id', albumIdForm)
          .single()

        if (albumError && albumError.code === '42703') {
          // Column doesn't exist yet, skip cover image setting
          console.log('cover_image_id column not found, skipping cover image setting')
        } else if (!albumError && !album.cover_image_id) {
          // Set this image as the cover image
          const { error: updateError } = await supabaseAdmin
            .from('photo_albums')
            .update({ cover_image_id: document.id })
            .eq('id', albumIdForm)
          
          if (updateError && updateError.code === '42703') {
            console.log('cover_image_id column not found, skipping cover image setting')
          }
        }
      } catch (coverError) {
        console.error('Error setting cover image:', coverError)
        // Don't fail the upload if cover image setting fails
        // This might happen if the cover_image_id column doesn't exist yet
      }
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error in documents POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
