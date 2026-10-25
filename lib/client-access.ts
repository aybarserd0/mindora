import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { resolveConversationAccessFromToken } from '@/lib/chat-access-tokens'

export type ClientAccess = {
  conversationId: string
  clientApplicationId: string
  expertId: string
  paymentStatus: string
  conversationStatus: string
}

/**
 * Danışan paneli bağlantısındaki token'ı çözer. Önce sohbet erişim token'ı,
 * yoksa seans erişim token'ı denenir (danışan panelinin mevcut davranışıyla aynı).
 */
export async function resolveClientAccess(rawToken: string | null | undefined): Promise<ClientAccess | null> {
  const token = (rawToken || '').trim().slice(0, 200)
  if (!token) return null

  const supabase = getSupabaseAdmin()
  let conversationId = await resolveConversationAccessFromToken(token, 'client')

  if (!conversationId) {
    const { data } = await supabase
      .from('session_access_tokens')
      .select('conversation_id, booking_id, user_type, revoked_at, expires_at')
      .eq('token', token)
      .eq('user_type', 'client')
      .maybeSingle()

    if (data && !data.revoked_at && new Date(data.expires_at).getTime() > Date.now()) {
      conversationId = data.conversation_id
      if (!conversationId && data.booking_id) {
        const { data: booking } = await supabase
          .from('session_bookings')
          .select('conversation_id')
          .eq('id', data.booking_id)
          .maybeSingle()
        conversationId = booking?.conversation_id || null
      }
    }
  }

  if (!conversationId) return null

  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, client_application_id, expert_id, payment_status, status')
    .eq('id', conversationId)
    .maybeSingle()

  if (!conversation) return null

  return {
    conversationId: conversation.id,
    clientApplicationId: conversation.client_application_id,
    expertId: conversation.expert_id,
    paymentStatus: conversation.payment_status,
    conversationStatus: conversation.status,
  }
}

export function withToken(path: string, token: string) {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}token=${encodeURIComponent(token)}`
}
