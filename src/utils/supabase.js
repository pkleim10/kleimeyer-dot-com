import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bqhwibhrukfryafwwwat.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxaHdpYmhydWtmcnlhZnd3d2F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxNTMzNjQsImV4cCI6MjA1NzcyOTM2NH0.xSvTqC29k-zphHofyTXZHB1RyCHq1szJMueL3qTJ_UM'

export const supabase = createClient(supabaseUrl, supabaseKey) 