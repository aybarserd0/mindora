import { createClient } from '@supabase/supabase-js'

export function createMindoraRealtimeClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase realtime env bilgileri eksik.')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}