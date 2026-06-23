import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UserType = 'client' | 'expert' | 'admin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function isValidUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'expert' || value === 'admin'
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_CONFIG_MISSING')
  }

  return createClient<any>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function resolveUserAccess(req: NextRequest) {
  const role = toText(req.nextUrl.searchParams.get('role'))
  const token = toText(req.nextUrl.searchParams.get('token'))
  const conversationId = toText(req.nextUrl.searchParams.get('conversationId'))
  const userId = toText(req.nextUrl.searchParams.get('userId'))

  if (!isValidUserType(role)) {
    return {
      ok: false as const,
      status: 400,
      error: 'Geçerli kullanıcı tipi gerekli.',
    }
  }

  if (role === 'admin') {
    const adminSecret = toText(process.env.ADMIN_API_SECRET)
    const authHeader = toText(req.headers.get('authorization'))
    const adminHeader = toText(req.headers.get('x-admin-secret'))
    const querySecret = toText(req.nextUrl.searchParams.get('adminSecret'))

    if (
      adminSecret &&
      (authHeader === `Bearer ${adminSecret}` ||
        adminHeader === adminSecret ||
        querySecret === adminSecret)
    ) {
      return {
        ok: true as const,
        role,
        userId: isValidUuid(userId) ? userId : null,
      }
    }

    return {
      ok: false as const,
      status: 401,
      error: 'Admin bildirimi için yetki gerekli.',
    }
  }

  if (isValidUuid(conversationId) && token) {
    const accessResult = await verifyConversationAccessToken({
      conversationId,
      token,
      role,
    })

    if (!accessResult?.ok) {
      return {
        ok: false as const,
        status: 403,
        error: 'Bildirimlere erişim yetkiniz yok.',
      }
    }

    return {
      ok: true as const,
      role,
      userId: isValidUuid(userId) ? userId : null,
    }
  }

  if (isValidUuid(userId) && token) {
    return {
      ok: true as const,
      role,
      userId,
    }
  }

  return {
    ok: false as const,
    status: 401,
    error: 'Bildirimler için güvenli token veya kullanıcı bilgisi gerekli.',
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await resolveUserAccess(req)

    if (!access.ok) {
      return jsonError(access.error, access.status)
    }

    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return jsonError('Geçerli istek gövdesi gerekli.')
    }

    const notificationId = toText((body as { notificationId?: unknown }).notificationId)

    if (!isValidUuid(notificationId)) {
      return jsonError('Geçerli notificationId gerekli.')
    }

    const supabase = getSupabaseAdmin()
    const readAt = new Date().toISOString()

    let query = (supabase as any)
      .from('notifications')
      .update({
        is_read: true,
        read_at: readAt,
      })
      .eq('id', notificationId)
      .eq('user_type', access.role)

    if (access.userId) {
      query = query.or(`user_id.is.null,user_id.eq.${access.userId}`)
    } else {
      query = query.is('user_id', null)
    }

    const { data, error } = await query
      .select('id, is_read, read_at')
      .maybeSingle()

    if (error) {
      console.error('NOTIFICATION_READ_ERROR', error)
      return jsonError('Bildirim okundu olarak işaretlenemedi.', 500)
    }

    if (!data) {
      return jsonError('Bildirim bulunamadı.', 404)
    }

    return NextResponse.json({
      ok: true,
      notification: data,
    })
  } catch (error) {
    console.error('NOTIFICATION_READ_UNEXPECTED_ERROR', error)

    const message =
      error instanceof Error && error.message === 'SUPABASE_CONFIG_MISSING'
        ? 'Supabase sunucu ayarları eksik.'
        : 'Bildirim okundu olarak işaretlenemedi.'

    return jsonError(message, 500)
  }
}
