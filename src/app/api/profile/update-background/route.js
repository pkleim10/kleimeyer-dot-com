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
    // Use single background field for all Other Fun Stuff pages, with fallback to old field names
    const existingBg = user.user_metadata?.other_fun_stuff_background || 
                       user.user_metadata?.just_for_me_background
    const existingTransparency = user.user_metadata?.other_fun_stuff_background_transparency ?? 
                                 user.user_metadata?.just_for_me_background_transparency
    const existingColor = user.user_metadata?.other_fun_stuff_background_color || 
                          user.user_metadata?.just_for_me_background_color

    const updatedMetadata = {
      ...user.user_metadata,
      // Use single field name for all Other Fun Stuff pages
      other_fun_stuff_background: backgroundUrl !== undefined ? backgroundUrl : existingBg,
      other_fun_stuff_background_transparency: transparency !== undefined ? transparency : (existingTransparency ?? 90),
      other_fun_stuff_background_color: screenColor !== undefined ? screenColor : (existingColor || '#f9fafb')
    }

    // Remove old field names if they exist (one-time migration)
    if (user.user_metadata?.just_for_me_background) {
      updatedMetadata.just_for_me_background = null
      updatedMetadata.just_for_me_background_transparency = null
      updatedMetadata.just_for_me_background_color = null
    }
    
    // Remove page-specific field names if they exist (cleanup from previous implementation)
    if (user.user_metadata?.other_fun_stuff_home_background) {
      updatedMetadata.other_fun_stuff_home_background = null
      updatedMetadata.other_fun_stuff_home_background_transparency = null
      updatedMetadata.other_fun_stuff_home_background_color = null
    }
    if (user.user_metadata?.other_fun_stuff_medication_background) {
      updatedMetadata.other_fun_stuff_medication_background = null
      updatedMetadata.other_fun_stuff_medication_background_transparency = null
      updatedMetadata.other_fun_stuff_medication_background_color = null
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

