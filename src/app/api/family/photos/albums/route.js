import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// GET: list albums
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')

    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: perms, error: permError } = await supabaseWithAuth
      .from('user_permissions').select('permission').eq('user_id', user.id)
    if (permError) return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })

    const allowed = perms?.some(p => p.permission === 'admin:full_access' || p.permission === 'family:full_access' || p.permission === 'family:view_documents')
    if (!allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    
    // Try to get albums with cover image data first
    let albums, error
    
    // First, try a simple query to check if cover_image_id column exists
    const testResult = await supabaseAdmin
      .from('photo_albums')
      .select('cover_image_id')
      .limit(1)
    
    if (testResult.error && testResult.error.code === '42703') {
      console.log('cover_image_id column not found, using basic query')
      // Column doesn't exist, use basic query
      const basicResult = await supabaseAdmin
        .from('photo_albums')
        .select(`
          id,
          name,
          description,
          created_by,
          created_at
        `)
        .order('created_at', { ascending: false })
      
      albums = basicResult.data
      error = basicResult.error
    } else {
      // Column exists, use full query with cover image data
      const result = await supabaseAdmin
        .from('photo_albums')
        .select(`
          id,
          name,
          description,
          cover_image_id,
          created_by,
          created_at
        `)
        .order('created_at', { ascending: false })
      
      albums = result.data
      error = result.error
    }
    
    if (error) {
      console.error('Final albums query error:', error)
      return NextResponse.json({ error: 'Failed to fetch albums: ' + error.message }, { status: 500 })
    }

    // Generate signed URLs for cover images (only if cover_image_id exists)
    const albumsWithCoverUrls = await Promise.all((albums || []).map(async (album) => {
      if (album.cover_image_id) {
        try {
          // Fetch the cover image data
          const { data: coverImage, error: coverError } = await supabaseAdmin
            .from('family_documents')
            .select('id, original_filename, file_path, file_type')
            .eq('id', album.cover_image_id)
            .single()
          
          if (!coverError && coverImage && coverImage.file_type === 'image' && coverImage.file_path) {
            const { data: signed, error: signedErr } = await supabaseAdmin
              .storage
              .from('family-documents')
              .createSignedUrl(coverImage.file_path, 3600) // 1 hour
            if (!signedErr && signed?.signedUrl) {
              return { 
                ...album, 
                cover_image: { 
                  ...coverImage, 
                  preview_url: signed.signedUrl 
                } 
              }
            }
          }
        } catch (_) {}
      }
      return album
    }))

    return NextResponse.json({ albums: albumsWithCoverUrls })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: create album
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.replace('Bearer ', '')
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: perms, error: permError } = await supabaseWithAuth
      .from('user_permissions').select('permission').eq('user_id', user.id)
    if (permError) return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 })

    const allowed = perms?.some(p => p.permission === 'admin:full_access' || p.permission === 'family:full_access' || p.permission === 'family:upload_documents' || p.permission === 'family:manage_documents')
    if (!allowed) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    const body = await request.json()
    const { name, description } = body
    if (!name || !name.trim()) return NextResponse.json({ error: 'Album name required' }, { status: 400 })

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: album, error } = await supabaseAdmin
      .from('photo_albums')
      .insert({ name: name.trim(), description: description || null, created_by: user.id })
      .select('id,name,description,created_at')
      .single()
    if (error) return NextResponse.json({ error: 'Failed to create album' }, { status: 500 })

    return NextResponse.json({ album }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


