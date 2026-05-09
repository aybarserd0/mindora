import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type UserType = 'client' | 'expert' | 'admin'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'expert' || value === 'admin'
}

async function verifyReadWriteAccess({
  req,
  conversationId,
  userType,
  body,
}: {
  req: NextRequest
  conversationId: string
  userType: UserType
  body?: any
}) {
  if (userType === 'admin') return { ok: true }

  const token =
    toText(req.nextUrl.searchParams.get('token')) ||
    toText(req.headers.get('x-chat-access-token')) ||
    toText(body?.token)

  const result = await verifyConversationAccessToken({
    conversationId,
    role: userType,
    token,
  })

  if (!result.ok) {
    return {
      ok: false,
      error: 'Okundu bilgisini güncelleme yetkiniz yok.',
    }
  }

  return { ok: true }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const conversationId = toText(id)
    const body = await req.json().catch(() => null)

    const userType = body?.userType

    if (!conversationId) {
      return NextResponse.json(
        { ok: false, error: 'Conversation ID zorunlu.' },
        { status: 400 }
      )
    }

    if (!isValidUserType(userType)) {
      return NextResponse.json(
        { ok: false, error: 'User type geçersiz.' },
        { status: 400 }
      )
    }

    const access = await verifyReadWriteAccess({
      req,
      conversationId,
      userType,
      body,
    })

    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: 403 }
      )
    }

    const supabase = getSupabaseAdmin() as any

    const now = new Date().toISOString()

    const { error } = await supabase.from('conversation_reads').upsert(
      {
        conversation_id: conversationId,
        user_type: userType,
        last_read_at: now,
      },
      {
        onConflict: 'conversation_id,user_type',
      }
    )

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Okundu bilgisi güncellenemedi.',
          detail: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        lastReadAt: now,
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
        error: 'Okundu bilgisi güncellenirken sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}