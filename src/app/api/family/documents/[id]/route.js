import { NextResponse } from 'next/server'
import { supabase } from '@/utils/supabase'

// GET - Get single document or download file
export async function GET(request, { params }) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has family role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['family', 'admin'])
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get document details
    const { data: document, error } = await supabase
      .from('family_documents')
      .select(`
        *,
        created_by_user:auth.users!family_documents_created_by_fkey(
          id,
          email,
          user_metadata
        )
      `)
      .eq('id', id)
      .single()

    if (error || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (download) {
      // Generate signed URL for download
      const { data: signedUrl, error: urlError } = await supabase.storage
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
    const { id } = params

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has family role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['family', 'admin'])
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get request body
    const body = await request.json()
    const { description, category, tags } = body

    // Update document
    const { data: document, error } = await supabase
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
    const { id } = params

    // Get the current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user has family role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .in('role', ['family', 'admin'])
      .single()

    if (!userRole) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get document details first
    const { data: document, error: fetchError } = await supabase
      .from('family_documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('family-documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
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
