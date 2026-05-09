import { NextRequest, NextResponse } from 'next/server'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

type ChatAccessRole = 'client' | 'expert'

function isValidRole(role: unknown): role is ChatAccessRole {
  return role === 'client' || role === 'expert'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const conversationId = body?.conversationId
    const role = body?.role
    const token = body?.token

    if (
      typeof conversationId !== 'string' ||
      !conversationId ||
      !isValidRole(role) ||
      typeof token !== 'string' ||
      !token
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Geçersiz erişim isteği.',
        },
        { status: 400 }
      )
    }

    const result = await verifyConversationAccessToken({
      conversationId,
      role,
      token,
    })

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Bu görüşmeye erişim yetkiniz yok veya link süresi dolmuş.',
          reason: result.reason,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      ok: true,
    })
  } catch (err) {
    console.error('CHAT ACCESS VERIFY ROUTE ERROR:', err)

    return NextResponse.json(
      {
        ok: false,
        error: 'Erişim doğrulama sırasında hata oluştu.',
      },
      { status: 500 }
    )
  }
}