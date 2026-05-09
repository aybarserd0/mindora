import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type UserType = 'client' | 'expert' | 'admin'

const VALID_USER_TYPES: UserType[] = ['client', 'expert', 'admin']

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

async function verifyUnreadAccess({
  req,
  conversationId,
  userType,
}: {
  req: NextRequest
  conversationId: string
  userType: UserType
}) {
  if (userType === 'admin') return { ok: true }

  const token =
    toText(req.nextUrl.searchParams.get('token')) ||
    toText(req.headers.get('x-chat-access-token'))

  const result = await verifyConversationAccessToken({
    conversationId,
    role: userType,
    token,
  })

  if (!result.ok) {
    return {
      ok: false,
      error: 'Okunmamış mesaj bilgisine erişim yetkiniz yok.',
    }
  }

  return { ok: true }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await params
    const conversationId = toText(resolved.id)

    const searchParams = req.nextUrl.searchParams
    const userType = searchParams.get('userType') as UserType | null

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID bulunamadı.' },
        { status: 400 }
      )
    }

    if (!userType || !VALID_USER_TYPES.includes(userType)) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz kullanıcı tipi.' },
        { status: 400 }
      )
    }

    const access = await verifyUnreadAccess({
      req,
      conversationId,
      userType,
    })

    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: readData, error: readError } = await supabase
      .from('conversation_reads')
      .select('last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_type', userType)
      .maybeSingle()

    if (readError) {
      return NextResponse.json(
        { ok: false, error: readError.message },
        { status: 500 }
      )
    }

    const lastReadAt =
      readData?.last_read_at || '1970-01-01T00:00:00.000Z'

    const { count, error: countError } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_type', userType)
      .gt('created_at', lastReadAt)

    if (countError) {
      return NextResponse.json(
        { ok: false, error: countError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        unreadCount: count || 0,
        lastReadAt,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err) {
    console.error('UNREAD COUNT ERROR:', err)

    return NextResponse.json(
      { ok: false, error: 'Beklenmeyen sunucu hatası.' },
      { status: 500 }
    )
  }
}