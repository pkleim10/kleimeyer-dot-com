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
    console.log('Attempting to remove is_active column from family_bulletins table...')
    
    // Try to execute the SQL directly
    const { data, error } = await supabase
      .rpc('exec', {
        sql: `
          -- Drop the index first
          DROP INDEX IF EXISTS idx_family_bulletins_active;
          
          -- Remove the column
          ALTER TABLE family_bulletins DROP COLUMN IF EXISTS is_active;
        `
      })

    if (error) {
      console.error('❌ Error executing SQL:', error)
      console.log('')
      console.log('Please run the following SQL manually in Supabase SQL Editor:')
      console.log('')
      console.log('-- Remove is_active column from family_bulletins table')
      console.log('DROP INDEX IF EXISTS idx_family_bulletins_active;')
      console.log('ALTER TABLE family_bulletins DROP COLUMN IF EXISTS is_active;')
      console.log('')
      console.log('Or copy the contents of: migrations/remove_is_active_column.sql')
    } else {
      console.log('✅ Successfully removed is_active column from family_bulletins table')
      console.log('Result:', data)
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
    console.log('')
    console.log('Please run the following SQL manually in Supabase SQL Editor:')
    console.log('')
    console.log('-- Remove is_active column from family_bulletins table')
    console.log('DROP INDEX IF EXISTS idx_family_bulletins_active;')
    console.log('ALTER TABLE family_bulletins DROP COLUMN IF EXISTS is_active;')
    console.log('')
    console.log('Or copy the contents of: migrations/remove_is_active_column.sql')
  }
}

removeIsActiveColumn()
