import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const isSupabaseConfigured = Boolean(url && key)
let client = null

export function getSupabaseClient() {
  if (!isSupabaseConfigured) throw new Error('supabase_not_configured')
  if (!client) client = createClient(url, key)
  return client
}
