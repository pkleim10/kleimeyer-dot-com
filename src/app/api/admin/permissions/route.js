import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdmin, verifyAuth } from '@/utils/roleChecks'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// GET - List all users with their roles
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (!(await isAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { supabaseWithAuth } = authResult

    // Get users with their roles
    let query = supabaseWithAuth
      .from('user_roles')
      .select(`
        user_id,
        role,
        created_at,
        updated_at
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: roles, error } = await query

    if (error) {
      console.error('Error fetching user roles:', error)
      return NextResponse.json({ error: 'Failed to fetch user roles' }, { status: 500 })
    }

    return NextResponse.json({ roles: roles || [] })
  } catch (error) {
    console.error('Error in permissions GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Assign role to a user
export async function POST(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (!(await isAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['member', 'family', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be: member, family, or admin' }, { status: 400 })
    }

    const { supabaseWithAuth } = authResult

    // Assign the role (upsert - insert or update)
    const { data, error } = await supabaseWithAuth
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' })
      .select()

    if (error) {
      console.error('Error assigning role:', error)
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 })
    }

    return NextResponse.json({ role: data[0] })
  } catch (error) {
    console.error('Error in permissions POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove role from user (sets to 'member' by default)
export async function DELETE(request) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Verify authentication
    const authResult = await verifyAuth(token)
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (!(await isAdmin(token))) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const { supabaseWithAuth } = authResult

    // Set role to 'member' (default role)
    const { error } = await supabaseWithAuth
      .from('user_roles')
      .update({ role: 'member' })
      .eq('user_id', userId)

    if (error) {
      console.error('Error removing role:', error)
      return NextResponse.json({ error: 'Failed to remove role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in permissions DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
