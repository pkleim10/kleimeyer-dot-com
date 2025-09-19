require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addCoverImageColumn() {
  try {
    console.log('Adding cover_image_id column to photo_albums table...')
    
    // Try to add the column directly
    const { error } = await supabase
      .from('photo_albums')
      .select('cover_image_id')
      .limit(1)
    
    if (error && error.code === '42703') {
      // Column doesn't exist, let's add it
      console.log('Column does not exist, attempting to add it...')
      
      // We can't use ALTER TABLE directly through the client, so we'll provide instructions
      console.log('❌ Cannot add column automatically. Please run the following SQL in your Supabase SQL Editor:')
      console.log('')
      console.log('ALTER TABLE photo_albums ADD COLUMN cover_image_id UUID REFERENCES family_documents(id) ON DELETE SET NULL;')
      console.log('CREATE INDEX IF NOT EXISTS idx_photo_albums_cover_image_id ON photo_albums(cover_image_id);')
      console.log('')
      console.log('After running this SQL, the cover image functionality will work properly.')
      return
    }
    
    if (error) {
      console.error('Error checking column:', error)
      return
    }
    
    console.log('✅ cover_image_id column already exists!')
    
  } catch (error) {
    console.error('Error:', error)
    console.log('Please run the following SQL manually in your Supabase SQL Editor:')
    console.log('')
    console.log('ALTER TABLE photo_albums ADD COLUMN cover_image_id UUID REFERENCES family_documents(id) ON DELETE SET NULL;')
    console.log('CREATE INDEX IF NOT EXISTS idx_photo_albums_cover_image_id ON photo_albums(cover_image_id);')
  }
}

addCoverImageColumn()
