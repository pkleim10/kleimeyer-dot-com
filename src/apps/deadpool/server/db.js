import { createClient } from '@supabase/supabase-js'

let client = null

export function getServiceClient() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service-role environment variables')
  }

  client = createClient(url, serviceKey)
  return client
}
