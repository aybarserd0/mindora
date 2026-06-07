import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

type SupabaseAdminClient = SupabaseClient<Database>

let adminClient: SupabaseAdminClient | null = null

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`[Supabase Admin] ${name} env bilgisi eksik.`)
  }

  return value
}

function getSupabaseUrl(): string {
  const url = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')

  try {
    new URL(url)
  } catch {
    throw new Error('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL geçerli bir URL değil.')
  }

  return url
}

function getServiceRoleKey(): string {
  const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (key.length < 40) {
    throw new Error('[Supabase Admin] SUPABASE_SERVICE_ROLE_KEY hatalı görünüyor.')
  }

  return key
}

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (adminClient) return adminClient

  adminClient = createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
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
