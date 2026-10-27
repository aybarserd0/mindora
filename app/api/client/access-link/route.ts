import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { professionLabel } from '@/lib/professions'
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

  // Danışan birden fazla hizmette (psikolog, diyetisyen, antrenör) olabilir:
  // her uzman için en güncel sohbetin bağlantısı tek e-postada gönderilir.
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, client_application_id, expert_id, updated_at')
    .in('client_application_id', clientRows.map((c) => c.id))
    .order('updated_at', { ascending: false })
    .limit(20)

  const latestPerExpert = new Map<string, { id: string; client_application_id: string; expert_id: string }>()
  for (const c of (conversations || []) as { id: string; client_application_id: string; expert_id: string }[]) {
    if (!latestPerExpert.has(c.expert_id)) latestPerExpert.set(c.expert_id, c)
  }
  const targets = [...latestPerExpert.values()].slice(0, 3)
  if (!targets.length) return NextResponse.json(GENERIC_RESPONSE)

  const { data: recent } = await supabase
    .from('conversation_access_tokens')
    .select('id')
    .in('conversation_id', targets.map((t) => t.id))
    .eq('role', 'client')
    .gte('created_at', new Date(Date.now() - RESEND_COOLDOWN_MS).toISOString())
    .limit(1)
  if ((recent || []).length) return NextResponse.json(GENERIC_RESPONSE)

  try {
    const { data: experts } = await supabase
      .from('experts')
      .select('id, name, profession')
      .in('id', targets.map((t) => t.expert_id))
    const expertById = new Map(((experts || []) as { id: string; name: string | null; profession: string | null }[]).map((e) => [e.id, e]))

    const lines: string[] = []
    for (const target of targets) {
      const access = await createConversationAccessToken({ conversationId: target.id, role: 'client', expiresInHours: 24 * 30 })
      const expert = expertById.get(target.expert_id)
      const label = `${professionLabel(expert?.profession)}${expert?.name ? ` · ${expert.name}` : ''}`
      lines.push(`${label}:\n${getSiteUrl()}/client/dashboard?token=${access.token}`)
    }
    const client = clientRows.find((c) => c.id === targets[0].client_application_id) || clientRows[0]

    await sendMail({
      to: client.email,
      subject: 'Mindora giriş bağlantın',
      text: `Merhaba ${client.name || ''},

Mindora paneline girmek için ${lines.length > 1 ? 'uzmanlarına göre bağlantıların' : 'bağlantın'}:

${lines.join('\n\n')}

${lines.length > 1 ? 'Bu bağlantılar' : 'Bu bağlantı'} 30 gün geçerlidir ve yalnızca sana özeldir; kimseyle paylaşma.
Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.

Mindora`,
    })
  } catch (sendError) {
    console.error('CLIENT_ACCESS_LINK_SEND_ERROR', sendError)
  }

  return NextResponse.json(GENERIC_RESPONSE)
}
