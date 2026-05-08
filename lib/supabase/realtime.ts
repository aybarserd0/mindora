import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let realtimeClient: ReturnType<typeof createClient<Database>> | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} env bilgisi eksik.`)
  }

  return value
}

export function createMindoraRealtimeClient() {
  if (realtimeClient) return realtimeClient

  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

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