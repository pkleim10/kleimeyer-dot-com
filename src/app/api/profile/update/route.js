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
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized - No auth header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token length:', token.length)
    
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
    console.log('Auth result:', { user: user ? 'Present' : 'Missing', error: authError })
    
    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: `Auth error: ${authError.message}` }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Auth session missing!' }, { status: 401 })
    }

    // Get the request body
    const body = await request.json()
    console.log('Request body:', body)
    
    const { firstName, lastName } = body

    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
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
        data: {
          first_name: firstName,
          last_name: lastName
        }
      })
    })

    const updateResult = await updateResponse.json()
    console.log('Direct API update result:', updateResult)

    if (!updateResponse.ok) {
      console.error('Update API error:', updateResult)
      return NextResponse.json({ 
        error: updateResult.error_description || updateResult.message || 'Failed to update profile' 
      }, { status: updateResponse.status })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updateResult
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 })
  }
}
