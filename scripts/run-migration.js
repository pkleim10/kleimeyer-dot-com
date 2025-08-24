require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('Running specialized announcement fields migration...')
    
    // Check if columns already exist
    const { data: columns, error: checkError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'family_bulletins')
      .eq('table_schema', 'public')
      .in('column_name', ['url', 'appointment_datetime', 'appointment_location', 'payment_amount', 'payment_due_date', 'payment_reference', 'payment_recipient', 'action_required', 'medical_provider'])

    if (checkError) {
      console.error('Error checking existing columns:', checkError)
      return
    }

    if (columns && columns.length === 9) {
      console.log('✅ All specialized fields already exist in the table')
      return
    }

    console.log('❌ Migration needs to be run manually')
    console.log('Please run the following SQL in your Supabase SQL Editor:')
    console.log('')
    console.log('ALTER TABLE family_bulletins')
    console.log('ADD COLUMN IF NOT EXISTS url TEXT,')
    console.log('ADD COLUMN IF NOT EXISTS appointment_datetime TIMESTAMP WITH TIME ZONE,')
    console.log('ADD COLUMN IF NOT EXISTS appointment_location TEXT,')
    console.log('ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),')
    console.log('ADD COLUMN IF NOT EXISTS payment_due_date DATE,')
    console.log('ADD COLUMN IF NOT EXISTS payment_reference TEXT,')
    console.log('ADD COLUMN IF NOT EXISTS payment_recipient TEXT,')
    console.log('ADD COLUMN IF NOT EXISTS action_required BOOLEAN DEFAULT FALSE,')
    console.log('ADD COLUMN IF NOT EXISTS medical_provider TEXT;')
    console.log('')
    console.log('Or copy the contents of: migrations/add_specialized_announcement_fields.sql')
    
  } catch (error) {
    console.error('Migration check failed:', error)
  }
}

runMigration()
