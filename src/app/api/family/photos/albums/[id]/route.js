import { createClient } from '@supabase/supabase-js'
import { isFamilyOrAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function GET(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return Response.json({ error: 'Album ID is required' }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication and check role
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return Response.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the album
    const { data: album, error: albumError } = await supabaseAdmin
      .from('photo_albums')
      .select('*')
      .eq('id', id)
      .single()

    if (albumError) {
      console.error('Error fetching album:', albumError)
      return Response.json({ error: 'Failed to fetch album' }, { status: 500 })
    }

    if (!album) {
      return Response.json({ error: 'Album not found' }, { status: 404 })
    }

    return Response.json(album)
  } catch (error) {
    console.error('Error in GET /api/family/photos/albums/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    if (!id) {
      return Response.json({ error: 'Album ID is required' }, { status: 400 })
    }

    if (!name || name.trim() === '') {
      return Response.json({ error: 'Album name is required' }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication and check role
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return Response.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Update the album
    const { data, error } = await supabaseAdmin
      .from('photo_albums')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating album:', error)
      return Response.json({ error: 'Failed to update album' }, { status: 500 })
    }

    return Response.json(data)
  } catch (error) {
    console.error('Error in PUT /api/family/photos/albums/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params

    if (!id) {
      return Response.json({ error: 'Album ID is required' }, { status: 400 })
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication and check role
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Family or Admin
    if (!(await isFamilyOrAdmin(token))) {
      return Response.json({ error: 'Forbidden - Family or Admin access required' }, { status: 403 })
    }

    const { user } = authResult

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // First, check if the album exists and get its creator
    const { data: album, error: fetchError } = await supabaseAdmin
      .from('photo_albums')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Error fetching album:', fetchError)
      return Response.json({ error: 'Album not found' }, { status: 404 })
    }

    // Check if the user created this album
    if (album.created_by !== user.id) {
      return Response.json({ error: 'You can only delete albums you created' }, { status: 403 })
    }

    // First, get all photos in this album to delete from storage
    const { data: photos, error: photosError } = await supabaseAdmin
      .from('family_documents')
      .select('id, file_path')
      .eq('album_id', id)

    if (photosError) {
      console.error('Error fetching photos for deletion:', photosError)
      return Response.json({ error: 'Failed to fetch photos for deletion' }, { status: 500 })
    }

    // Delete photos from storage
    if (photos && photos.length > 0) {
      console.log(`🗑️ Deleting ${photos.length} photos from storage...`)
      
      for (const photo of photos) {
        if (photo.file_path) {
          try {
            const { error: storageError } = await supabaseAdmin.storage
              .from('family-documents')
              .remove([photo.file_path])
            
            if (storageError) {
              console.error(`Error deleting photo ${photo.id} from storage:`, storageError)
              // Continue with other photos even if one fails
            } else {
              console.log(`✅ Deleted photo from storage: ${photo.file_path}`)
            }
          } catch (err) {
            console.error(`Error deleting photo ${photo.id}:`, err)
            // Continue with other photos
          }
        }
      }
    }

    // Delete the album record from database
    const { error } = await supabaseAdmin
      .from('photo_albums')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting album:', error)
      return Response.json({ error: 'Failed to delete album' }, { status: 500 })
    }

    console.log(`✅ Successfully deleted album ${id} and ${photos?.length || 0} photos`)
    return Response.json({ 
      success: true, 
      deletedPhotos: photos?.length || 0 
    })
  } catch (error) {
    console.error('Error in DELETE /api/family/photos/albums/[id]:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
