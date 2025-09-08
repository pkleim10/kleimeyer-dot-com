require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function removeIsActiveColumn() {
  try {
    console.log('Removing is_active column from family_bulletins table...')
    
    // First, let's check if the column exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'family_bulletins')
      .eq('table_schema', 'public')
      .eq('column_name', 'is_active')

    if (checkError) {
      console.error('Error checking columns:', checkError)
      return
    }

    if (!columns || columns.length === 0) {
      console.log('✅ is_active column does not exist in the table')
      return
    }

    console.log('❌ is_active column still exists. Please run the following SQL manually in Supabase SQL Editor:')
    console.log('')
    console.log('-- Remove is_active column from family_bulletins table')
    console.log('DROP INDEX IF EXISTS idx_family_bulletins_active;')
    console.log('ALTER TABLE family_bulletins DROP COLUMN IF EXISTS is_active;')
    console.log('')
    console.log('Or copy the contents of: migrations/remove_is_active_column.sql')
    
  } catch (error) {
    console.error('Migration check failed:', error)
  }
}

removeIsActiveColumn()
