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
      query = query.eq('category', category)
    }

    if (fileType && fileType !== 'all') {
      query = query.eq('file_type', fileType)
    }

    if (search) {
      query = query.or(`original_filename.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: documents, error } = await query

    console.log('Documents query result:', { documents, error })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json({ error: 'Failed to fetch documents: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ documents })
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

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseWithAuth.storage
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

    // Create admin client for database operations with proper configuration
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

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

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error in documents POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
