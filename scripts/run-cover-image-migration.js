require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Running album cover image migration...')
    
    // Check if cover_image_id column already exists
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'photo_albums')
      .eq('table_schema', 'public')
      .eq('column_name', 'cover_image_id')

    if (checkError) {
      console.error('Error checking existing columns:', checkError)
      return
    }

    if (columns && columns.length > 0) {
      console.log('✅ cover_image_id column already exists')
      return
    }

    console.log('Adding cover_image_id column to photo_albums table...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_album_cover_image.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
      console.log('Please run the following SQL manually in your Supabase SQL Editor:')
      console.log('')
      console.log(migrationSQL)
      return
    }

    console.log('✅ Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    console.log('Please run the following SQL manually in your Supabase SQL Editor:')
    console.log('')
    console.log('ALTER TABLE photo_albums ADD COLUMN cover_image_id UUID REFERENCES family_documents(id) ON DELETE SET NULL;')
    console.log('CREATE INDEX IF NOT EXISTS idx_photo_albums_cover_image_id ON photo_albums(cover_image_id);')
  }
}

runMigration()
