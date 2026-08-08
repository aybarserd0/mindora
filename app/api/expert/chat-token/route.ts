import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromRequest } from '@/lib/security/expert-session'
import { createConversationAccessToken } from '@/lib/chat-access-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  )
}

/**
 * Bridges the new expert dashboard session (cookie-based, no URL token) to
 * the older per-conversation chat access token that `/expert/chat/[id]` and
 * its dependent APIs (messages, reads, attachments) already expect as a
 * `?token=` query param. Rather than rewriting every one of those routes,
 * an expert who is logged in and actually owns the conversation gets a
 * fresh token minted on demand.
 */
export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get('conversationId') || ''

  if (!isValidUuid(conversationId)) {
    return NextResponse.json(
      { ok: false, error: 'Geçerli conversationId gerekli.', reason: 'invalid_conversation' },
      { status: 400 }
    )
  }

  const expertId = await getExpertIdFromRequest(req)

  if (!expertId) {
    return NextResponse.json(
      { ok: false, error: 'Uzman oturumu bulunamadı.', reason: 'not_authenticated' },
      { status: 401 }
    )
  }

  const supabase = getSupabaseAdmin() as any

  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('id, expert_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    console.error('EXPERT_CHAT_TOKEN_CONVERSATION_LOOKUP_ERROR', error)
    return NextResponse.json(
      { ok: false, error: 'Görüşme kontrol edilemedi.', reason: 'lookup_failed' },
      { status: 500 }
    )
  }

  if (!conversation) {
    return NextResponse.json(
      { ok: false, error: 'Görüşme bulunamadı.', reason: 'not_found' },
      { status: 404 }
    )
  }

  if (conversation.expert_id !== expertId) {
    return NextResponse.json(
      { ok: false, error: 'Bu görüşme hesabınıza ait değil.', reason: 'not_your_conversation' },
      { status: 403 }
    )
  }

  try {
    const { token } = await createConversationAccessToken({
      conversationId,
      role: 'expert',
      expiresInHours: 24 * 30,
    })

    return NextResponse.json({ ok: true, token })
  } catch (tokenError) {
    console.error('EXPERT_CHAT_TOKEN_CREATE_ERROR', tokenError)

    return NextResponse.json(
      { ok: false, error: 'Erişim anahtarı oluşturulamadı.', reason: 'token_create_failed' },
      { status: 500 }
    )
  }
}
