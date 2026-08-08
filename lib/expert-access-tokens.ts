import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Passwordless "magic link" session tokens for the expert dashboard —
 * mirrors the client side's `conversation_access_tokens` model
 * (lib/chat-access-tokens.ts) instead of a password/JWT login.
 *
 * Requires a Supabase table (create once via SQL editor — no migration
 * files exist in this repo for any table, so this follows the project's
 * existing convention):
 *
 *   create table expert_access_tokens (
 *     id uuid primary key default gen_random_uuid(),
 *     expert_id uuid not null references experts(id) on delete cascade,
 *     token text not null unique,
 *     expires_at timestamptz not null,
 *     revoked boolean not null default false,
 *     created_at timestamptz not null default now()
 *   );
 *   create index expert_access_tokens_expert_id_idx on expert_access_tokens(expert_id);
 *   create index expert_access_tokens_token_idx on expert_access_tokens(token);
 */

type ExpertAccessTokenRow = {
  id: string
  expert_id: string
  token: string
  expires_at: string
  revoked: boolean
}

function getUntypedSupabaseAdmin() {
  return getSupabaseAdmin() as any
}

export function generateExpertAccessToken() {
  return crypto.randomBytes(32).toString('hex')
}

export async function createExpertAccessToken({
  expertId,
  expiresInHours = 24 * 30,
}: {
  expertId: string
  expiresInHours?: number
}) {
  const supabase = getUntypedSupabaseAdmin()
  const token = generateExpertAccessToken()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('expert_access_tokens')
    .insert({
      expert_id: expertId,
      token,
      expires_at: expiresAt,
      revoked: false,
    })
    .select('token, expires_at')
    .single()

  if (error) {
    console.error('createExpertAccessToken error:', error)
    throw new Error('Expert access token could not be created.')
  }

  return data as { token: string; expires_at: string }
}

/**
 * Resolves a bare token to its owning expert, the same way
 * `resolveFromConversationAccessToken` does for clients — the caller
 * doesn't need to already know the expertId.
 */
export async function resolveExpertIdFromToken(token: string | null | undefined) {
  const cleanToken = String(token || '').trim()

  if (!cleanToken) return null

  const supabase = getUntypedSupabaseAdmin()

  const { data, error } = await supabase
    .from('expert_access_tokens')
    .select('id, expert_id, token, expires_at, revoked')
    .eq('token', cleanToken)
    .maybeSingle()

  if (error) {
    console.error('resolveExpertIdFromToken error:', error)
    return null
  }

  const row = data as ExpertAccessTokenRow | null

  if (!row) return null
  if (row.revoked) return null
  if (new Date(row.expires_at).getTime() < Date.now()) return null

  return row.expert_id
}

export async function revokeExpertAccessTokens(expertId: string) {
  const supabase = getUntypedSupabaseAdmin()

  const { error } = await supabase
    .from('expert_access_tokens')
    .update({ revoked: true })
    .eq('expert_id', expertId)

  if (error) {
    console.error('revokeExpertAccessTokens error:', error)
  }
}
