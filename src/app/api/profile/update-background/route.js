import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function PUT(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No auth header' }, { status: 401 })
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
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Auth session missing!' }, { status: 401 })
    }

    // Get the request body
    const body = await request.json()
    const { backgroundUrl, transparency, screenColor } = body

    // Prepare updated metadata
    const updatedMetadata = {
      ...user.user_metadata,
      just_for_me_background: backgroundUrl !== undefined ? backgroundUrl : user.user_metadata?.just_for_me_background
    }

    // Update transparency if provided
    if (transparency !== undefined) {
      updatedMetadata.just_for_me_background_transparency = transparency
    }

    // Update screen color if provided
    if (screenColor !== undefined) {
      updatedMetadata.just_for_me_background_color = screenColor
    }

    // Use the Supabase REST API directly to update user metadata
    const updateResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        data: updatedMetadata
      })
    })

    const updateResult = await updateResponse.json()

    if (!updateResponse.ok) {
      console.error('Update API error:', updateResult)
      return NextResponse.json({ 
        error: updateResult.error_description || updateResult.message || 'Failed to update background' 
      }, { status: updateResponse.status })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Background updated successfully',
      user: updateResult
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}

