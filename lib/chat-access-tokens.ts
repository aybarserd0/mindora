import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type ChatAccessRole = 'client' | 'expert'

type CreateTokenInput = {
  conversationId: string
  role: ChatAccessRole
  expiresInHours?: number
}

type VerifyTokenInput = {
  conversationId: string
  role: ChatAccessRole
  token: string | null
}

type ConversationAccessTokenRow = {
  id: string
  conversation_id: string
  role: ChatAccessRole
  token: string
  expires_at: string
  revoked: boolean
}

type ConversationAccessTokenInsert = {
  conversation_id: string
  role: ChatAccessRole
  token: string
  expires_at: string
  revoked?: boolean
}

function getUntypedSupabaseAdmin() {
  return getSupabaseAdmin() as any
}

export function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createConversationAccessToken({
  conversationId,
  role,
  expiresInHours = 24 * 7,
}: CreateTokenInput) {
  const supabase = getUntypedSupabaseAdmin()
  const token = generateSecureToken()

  const expiresAt = new Date(
    Date.now() + expiresInHours * 60 * 60 * 1000
  ).toISOString()

  const insertPayload: ConversationAccessTokenInsert = {
    conversation_id: conversationId,
    role,
    token,
    expires_at: expiresAt,
    revoked: false,
  }

  const { data, error } = await supabase
    .from('conversation_access_tokens')
    .insert(insertPayload)
    .select('token, expires_at')
    .single()

  if (error) {
    console.error('createConversationAccessToken error:', error)
    throw new Error('Chat access token could not be created.')
  }

  return data as Pick<ConversationAccessTokenRow, 'token' | 'expires_at'>
}

export async function verifyConversationAccessToken({
  conversationId,
  role,
  token,
}: VerifyTokenInput) {
  if (!token) {
    return {
      ok: false,
      reason: 'missing_token',
    }
  }

  const supabase = getUntypedSupabaseAdmin()

  const { data, error } = await supabase
    .from('conversation_access_tokens')
    .select('id, conversation_id, role, token, expires_at, revoked')
    .eq('conversation_id', conversationId)
    .eq('role', role)
    .eq('token', token)
    .maybeSingle()

  if (error) {
    console.error('verifyConversationAccessToken error:', error)

    return {
      ok: false,
      reason: 'db_error',
    }
  }

  const row = data as ConversationAccessTokenRow | null

  if (!row) {
    return {
      ok: false,
      reason: 'invalid_token',
    }
  }

  if (row.revoked) {
    return {
      ok: false,
      reason: 'revoked_token',
    }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return {
      ok: false,
      reason: 'expired_token',
    }
  }

  return {
    ok: true,
    tokenId: row.id,
  }
}

/**
 * Resolves a bare token to its conversation, for callers that don't
 * already know the conversationId (e.g. a dashboard bell that only has a
 * token in the URL). Mirrors the token-only lookup pattern already used in
 * app/api/client/dashboard/route.ts.
 */
export async function resolveConversationAccessFromToken(
  token: string,
  role: ChatAccessRole
) {
  if (!token) return null

  const supabase = getUntypedSupabaseAdmin()

  const { data, error } = await supabase
    .from('conversation_access_tokens')
    .select('id, conversation_id, role, token, expires_at, revoked')
    .eq('token', token)
    .eq('role', role)
    .maybeSingle()

  if (error) {
    console.error('resolveConversationAccessFromToken error:', error)
    return null
  }

  const row = data as ConversationAccessTokenRow | null

  if (!row) return null
  if (row.revoked) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null

  return row.conversation_id
}

export async function revokeConversationAccessTokens(conversationId: string) {
  const supabase = getUntypedSupabaseAdmin()

  const { error } = await supabase
    .from('conversation_access_tokens')
    .update({ revoked: true })
    .eq('conversation_id', conversationId)

  if (error) {
    console.error('revokeConversationAccessTokens error:', error)
    throw new Error('Chat access tokens could not be revoked.')
  }

  return { ok: true }
}