import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function PUT(request, { params }) {
  try {
    const { id: albumId } = await params
    const body = await request.json()
    const { imageId } = body

    if (!albumId) {
      return Response.json({ error: 'Album ID is required' }, { status: 400 })
    }

    if (!imageId) {
      return Response.json({ error: 'Image ID is required' }, { status: 400 })
    }

    // Get the current user
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get('Authorization') || ''
        }
      }
    })

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the album exists and get its creator
    const { data: album, error: albumError } = await supabaseAdmin
      .from('photo_albums')
      .select('created_by')
      .eq('id', albumId)
      .single()

    if (albumError) {
      console.error('Error fetching album:', albumError)
      return Response.json({ error: 'Album not found' }, { status: 404 })
    }

    // Check if the user created this album
    if (album.created_by !== user.id) {
      return Response.json({ error: 'You can only modify albums you created' }, { status: 403 })
    }

    // Verify the image exists and belongs to this album
    const { data: image, error: imageError } = await supabaseAdmin
      .from('family_documents')
      .select('id, album_id')
      .eq('id', imageId)
      .eq('album_id', albumId)
      .single()

    if (imageError || !image) {
      return Response.json({ error: 'Image not found in this album' }, { status: 404 })
    }

    // Update the album's cover image
    const { error: updateError } = await supabaseAdmin
      .from('photo_albums')
      .update({ cover_image_id: imageId })
      .eq('id', albumId)

    if (updateError) {
      console.error('Error updating cover image:', updateError)
      if (updateError.code === '42703') {
        return Response.json({ error: 'Cover image feature not available yet. Please run the database migration first.' }, { status: 501 })
      }
      return Response.json({ error: 'Failed to set cover image' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/family/photos/albums/[id]/cover:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
