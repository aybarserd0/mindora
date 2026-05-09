import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type UserType = 'client' | 'expert' | 'admin'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

async function verifyReadAccess(req: NextRequest, conversationId: string) {
  const role = toText(req.nextUrl.searchParams.get('role'))
  const token = toText(req.nextUrl.searchParams.get('token'))

  if (role === 'admin') {
    return { ok: true }
  }

  if (role !== 'client' && role !== 'expert') {
    return {
      ok: false,
      error: 'Erişim tipi geçersiz.',
    }
  }

  const result = await verifyConversationAccessToken({
    conversationId,
    role,
    token,
  })

  if (!result.ok) {
    return {
      ok: false,
      error: 'Okunma bilgisine erişim yetkiniz yok.',
    }
  }

  return { ok: true }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const conversationId = toText(id)

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID zorunlu.' },
        { status: 400 }
      )
    }

    const access = await verifyReadAccess(req, conversationId)

    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('conversation_reads')
      .select('user_type,last_read_at')
      .eq('conversation_id', conversationId)

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Okunma bilgisi alınamadı.' },
        { status: 500 }
      )
    }

    const reads: Record<UserType, string | null> = {
      client: null,
      expert: null,
      admin: null,
    }

    for (const item of data || []) {
      const userType = item.user_type as UserType

      if (userType === 'client' || userType === 'expert' || userType === 'admin') {
        reads[userType] = item.last_read_at
      }
    }

    return NextResponse.json(
      {
        ok: true,
        reads,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}