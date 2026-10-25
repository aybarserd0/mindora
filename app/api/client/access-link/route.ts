import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { createConversationAccessToken } from '@/lib/chat-access-tokens'
import { sendMail } from '@/lib/mail/smtp'
import { getSiteUrl } from '@/lib/site-url'

export const runtime = 'nodejs'

const GENERIC_RESPONSE = {
  ok: true,
  message: 'Bu e-posta adresiyle kayıtlı bir danışan hesabı varsa giriş bağlantısı birkaç dakika içinde gelecek.',
}

/** Aynı sohbet için bu süre içinde ikinci bağlantı gönderilmez. */
const RESEND_COOLDOWN_MS = 2 * 60_000

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 200
}

/**
 * Danışan panel bağlantısını e-postayla yeniden gönderir. Kayıt olup olmadığı
 * yanıttan anlaşılmaz (her durumda aynı mesaj döner).
 */
export async function POST(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-access-link', limit: 5, windowMs: 10 * 60_000 })
  if (limited) return limited

  const body = (await req.json().catch(() => null)) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Geçerli bir e-posta adresi yaz.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  const pattern = email.replace(/[\\%_]/g, (c) => `\\${c}`)

  const { data: clients, error } = await supabase
    .from('client_applications')
    .select('id, name, email')
    .ilike('email', pattern)
    .limit(10)

  if (error) {
    console.error('CLIENT_ACCESS_LINK_LOOKUP_ERROR', error)
    return NextResponse.json(GENERIC_RESPONSE)
  }

  const clientRows = (clients || []) as { id: string; name: string | null; email: string }[]
  if (!clientRows.length) return NextResponse.json(GENERIC_RESPONSE)

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, client_application_id, updated_at')
    .in('client_application_id', clientRows.map((c) => c.id))
    .order('updated_at', { ascending: false })
    .limit(1)

  const conversation = (conversations || [])[0] as { id: string; client_application_id: string } | undefined
  if (!conversation) return NextResponse.json(GENERIC_RESPONSE)

  const { data: recent } = await supabase
    .from('conversation_access_tokens')
    .select('id')
    .eq('conversation_id', conversation.id)
    .eq('role', 'client')
    .gte('created_at', new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString())
    .limit(1)
  if ((recent || []).length) return NextResponse.json(GENERIC_RESPONSE)

  try {
    const access = await createConversationAccessToken({ conversationId: conversation.id, role: 'client', expiresInHours: 24 * 30 })
    const client = clientRows.find((c) => c.id === conversation.client_application_id) || clientRows[0]
    const link = `${getSiteUrl()}/client/dashboard?token=${access.token}`

    await sendMail({
      to: client.email,
      subject: 'Mindora giriş bağlantın',
      text: `Merhaba ${client.name || ''},

Mindora paneline girmek için bağlantın:
${link}

Bu bağlantı 30 gün geçerlidir ve yalnızca sana özeldir; kimseyle paylaşma.
Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.

Mindora`,
    })
  } catch (sendError) {
    console.error('CLIENT_ACCESS_LINK_SEND_ERROR', sendError)
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
