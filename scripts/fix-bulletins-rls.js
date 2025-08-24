require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixBulletinsRLS() {
  try {
    console.log('Fixing family_bulletins RLS policies...')
    
    // Drop existing update policy
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "Contributors and admins can update bulletins" ON family_bulletins;'
    })
    
    if (dropError) {
      console.log('Note: Could not drop existing policy (might not exist):', dropError.message)
    }

    // Create new policy that allows family members, contributors, and admins to update bulletins
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE POLICY "Family members, contributors and admins can update bulletins" ON family_bulletins
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role IN ('family', 'contributor', 'admin')
          )
        );
      `
    })
    
    if (createError) {
      console.error('Error creating RLS policy:', createError)
      console.log('\nPlease run the following SQL manually in your Supabase SQL Editor:')
      console.log('')
      console.log('DROP POLICY IF EXISTS "Contributors and admins can update bulletins" ON family_bulletins;')
      console.log('')
      console.log('CREATE POLICY "Family members, contributors and admins can update bulletins" ON family_bulletins')
      console.log('  FOR UPDATE USING (')
      console.log('    EXISTS (')
      console.log('      SELECT 1 FROM user_roles')
      console.log('      WHERE user_id = auth.uid() AND role IN (\'family\', \'contributor\', \'admin\')')
      console.log('    )')
      console.log('  );')
      return
    }

    console.log('✅ RLS policy updated successfully!')
    
  } catch (error) {
    console.error('Error fixing RLS policies:', error)
  }
}

fixBulletinsRLS()
