import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null

export async function POST(request) {
  try {
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

    // Check if user is admin
    const { data: userRole, error: roleError } = await supabaseWithAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || userRole?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    // Run the RLS fix SQL
    const rlsFixSQL = `
      -- Drop existing policies
      DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
      DROP POLICY IF EXISTS "Authenticated users can manage roles" ON user_roles;

      -- Create new policies that allow admins to see all users
      -- Allow users to view their own role
      CREATE POLICY "Users can view their own role" ON user_roles
        FOR SELECT USING (auth.uid() = user_id);

      -- Allow admins to view all roles
      CREATE POLICY "Admins can view all roles" ON user_roles
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        );

      -- Allow admins to manage all roles
      CREATE POLICY "Admins can manage all roles" ON user_roles
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
          )
        );
    `

    const { error: sqlError } = await supabaseAdmin.rpc('exec_sql', { sql: rlsFixSQL })

    if (sqlError) {
      console.error('SQL execution error:', sqlError)
      return NextResponse.json({ 
        error: 'Failed to execute SQL',
        details: sqlError
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'RLS policies updated successfully'
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 })
  }
}
