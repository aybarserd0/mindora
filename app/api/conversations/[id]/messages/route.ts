import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type SenderType = 'client' | 'expert' | 'admin'

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function detectContactLeak(message: string) {
  const text = message.toLowerCase()

  const rules = [
    {
      key: 'email',
      pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
    },
    {
      key: 'phone_tr',
      pattern:
        /(\+90|0090|0)?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/,
    },
    {
      key: 'whatsapp',
      pattern: /(whatsapp|watsap|wp|wa\.me)/i,
    },
    {
      key: 'instagram',
      pattern: /(instagram|insta|ig|@[\w.]{3,})/i,
    },
    {
      key: 'telegram',
      pattern: /(telegram|t\.me)/i,
    },
    {
      key: 'iban',
      pattern:
        /tr\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/i,
    },
    {
      key: 'external_payment',
      pattern: /(iban|havale|eft|papara|payfix|elden ödeme|nakit)/i,
    },
  ]

  const matched = rules.filter((rule) => rule.pattern.test(text))

  return {
    isFlagged: matched.length > 0,
    reason: matched.map((item) => item.key).join(', '),
  }
}

function isValidSenderType(value: unknown): value is SenderType {
  return value === 'client' || value === 'expert' || value === 'admin'
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const conversationId = toText(id)

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID zorunlu.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Konuşma bulunamadı.',
          detail: conversationError?.message || null,
        },
        { status: 404 }
      )
    }

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(
        `
        id,
        conversation_id,
        sender_type,
        sender_name,
        message,
        is_flagged,
        flag_reason,
        created_at
      `
      )
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mesajlar alınamadı.',
          detail: messagesError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        conversation,
        messages: messages || [],
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Mesajlar alınırken sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const conversationId = toText(id)

    const body = await req.json().catch(() => null)

    const senderType = body?.senderType
    const senderName = toText(body?.senderName)
    const message = toText(body?.message)

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID zorunlu.' },
        { status: 400 }
      )
    }

    if (!isValidSenderType(senderType)) {
      return NextResponse.json(
        { ok: false, error: 'Gönderici tipi geçersiz.' },
        { status: 400 }
      )
    }

    if (!message) {
      return NextResponse.json(
        { ok: false, error: 'Mesaj boş olamaz.' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { ok: false, error: 'Mesaj en fazla 2000 karakter olabilir.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle()

    if (conversationError || !conversation) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Konuşma bulunamadı.',
          detail: conversationError?.message || null,
        },
        { status: 404 }
      )
    }

    if (
      senderType !== 'admin' &&
      (conversation.status !== 'active' ||
        conversation.payment_status !== 'paid')
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme tamamlanmadan platform içi mesajlaşma başlatılamaz.',
        },
        { status: 403 }
      )
    }

    const leak = detectContactLeak(message)

    if (senderType !== 'admin' && leak.isFlagged) {
      const { data: flaggedMessage, error: flaggedError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: senderType,
          sender_name: senderName || senderType,
          message,
          is_flagged: true,
          flag_reason: leak.reason || 'contact_leak',
        })
        .select('*')
        .single()

      if (flaggedError) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Flagged mesaj kaydedilemedi.',
            detail: flaggedError.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        {
          ok: false,
          blocked: true,
          error:
            'Mesajda platform dışı iletişim veya ödeme bilgisi tespit edildi. Lütfen telefon, e-posta, sosyal medya, IBAN veya WhatsApp bilgisi paylaşmadan tekrar deneyin.',
          message: flaggedMessage,
        },
        { status: 400 }
      )
    }

    const { data: createdMessage, error: createError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: senderType,
        sender_name: senderName || senderType,
        message,
        is_flagged: false,
        flag_reason: null,
      })
      .select('*')
      .single()

    if (createError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Mesaj kaydedilemedi.',
          detail: createError.message,
        },
        { status: 500 }
      )
    }

    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return NextResponse.json({
      ok: true,
      message: createdMessage,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Mesaj gönderilirken sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}