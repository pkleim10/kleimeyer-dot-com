import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Get document details
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('family_documents')
      .select('id, file_path, file_type, original_filename')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.file_type !== 'image' || !document.file_path) {
      return NextResponse.json({ error: 'Not an image file' }, { status: 400 })
    }

    // Generate high-quality signed URL for lightbox
    const { data: signed, error: signedErr } = await supabaseAdmin.storage
      .from('family-documents')
      .createSignedUrl(document.file_path, 3600) // 1 hour

    if (signedErr || !signed?.signedUrl) {
      console.error('Error generating signed URL:', signedErr)
      return NextResponse.json({ error: 'Failed to generate image URL' }, { status: 500 })
    }

    return NextResponse.json({ 
      lightbox_url: signed.signedUrl,
      filename: document.original_filename
    })

  } catch (error) {
    console.error('Error in lightbox image API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
