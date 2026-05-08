import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let adminClient: ReturnType<typeof createClient<Database>> | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} env bilgisi eksik.`)
  }

  return value
}

export function getSupabaseAdmin() {
  if (adminClient) return adminClient

  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'mindora-admin-server-client',
      },
    },
  })

  return adminClient
}

export function resetSupabaseAdmin() {
  adminClient = null
}