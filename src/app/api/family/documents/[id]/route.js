import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// GET - Get single document or download file
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'

    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Set the auth token for this request
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage documents
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
      p.permission === 'family:manage_documents'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - manage permission required' }, { status: 403 })
    }

    // Get document details
    const { data: document, error } = await supabaseWithAuth
      .from('family_documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (download) {
      // Generate signed URL for download
      const { data: signedUrl, error: urlError } = await supabaseWithAuth.storage
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
    
    // Set the auth token for this request
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage documents
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
      p.permission === 'family:manage_documents'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - manage permission required' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { description, category, tags } = body

    // Update document
    const { data: document, error } = await supabaseWithAuth
      .from('family_documents')
      .update({
        description: description || null,
        category: category || 'general',
        tags: tags || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

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
    
    // Set the auth token for this request
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to manage documents
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
      p.permission === 'family:manage_documents'
    )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied - manage permission required' }, { status: 403 })
    }

    // Get document details first
    const { data: document, error: fetchError } = await supabaseWithAuth
      .from('family_documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabaseWithAuth.storage
      .from('family-documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabaseWithAuth
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
