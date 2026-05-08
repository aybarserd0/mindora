import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let realtimeClient: ReturnType<typeof createClient<Database>> | null = null

export function createMindoraRealtimeClient() {
  if (realtimeClient) return realtimeClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL env bilgisi eksik.')
  }

  if (!supabaseAnonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY env bilgisi eksik.')
  }

  realtimeClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'mindora-realtime-client',
      },
    },
  })

  return realtimeClient
}

export function resetMindoraRealtimeClient() {
  realtimeClient = null
}