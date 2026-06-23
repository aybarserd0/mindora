import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UserType = 'client' | 'expert' | 'admin'

type NotificationType =
  | 'message'
  | 'session'
  | 'payment'
  | 'review'
  | 'system'
  | 'admin'

type NotificationRow = {
  id: string
  user_type: UserType
  user_id: string | null
  title: string
  message: string
  type: NotificationType | string
  is_read: boolean
  link: string | null
  metadata?: Record<string, unknown> | null
  read_at?: string | null
  expires_at?: string | null
  created_at: string
}

type CreateNotificationBody = {
  userType?: unknown
  userId?: unknown
  title?: unknown
  message?: unknown
  type?: unknown
  link?: unknown
  metadata?: unknown
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 30

const ALLOWED_USER_TYPES = new Set<UserType>(['client', 'expert', 'admin'])

const ALLOWED_NOTIFICATION_TYPES = new Set<NotificationType>([
  'message',
  'session',
  'payment',
  'review',
  'system',
  'admin',
])

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  )
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function isValidUserType(value: unknown): value is UserType {
  return ALLOWED_USER_TYPES.has(value as UserType)
}

function normalizeNotificationType(value: unknown): NotificationType {
  const text = toText(value).toLowerCase()

  if (ALLOWED_NOTIFICATION_TYPES.has(text as NotificationType)) {
    return text as NotificationType
  }

  return 'system'
}

function cleanText(value: unknown, maxLength = 240) {
  return toText(value)
    .replace(/\s+/g, ' ')
    .slice(0, maxLength)
}

function cleanLink(value: unknown) {
  const text = toText(value).slice(0, 500)

  if (!text) return null
  if (text.startsWith('/')) return text

  try {
    const url = new URL(text)

    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.toString()
    }
  } catch {
    return null
  }

  return null
}

function cleanLimit(value: unknown) {
  const raw = Number(value)

  if (!Number.isInteger(raw) || raw <= 0) return DEFAULT_LIMIT

  return Math.min(raw, MAX_LIMIT)
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

function isAuthorizedInternalRequest(req: NextRequest) {
  const internalSecret = toText(process.env.INTERNAL_API_SECRET)
  const cronSecret = toText(process.env.CRON_SECRET)

  if (!internalSecret && !cronSecret) return false

  const authHeader = toText(req.headers.get('authorization'))
  const internalHeader = toText(req.headers.get('x-internal-secret'))
  const cronHeader = toText(req.headers.get('x-cron-secret'))

  return (
    (Boolean(internalSecret) &&
      (authHeader === `Bearer ${internalSecret}` || internalHeader === internalSecret)) ||
    (Boolean(cronSecret) &&
      (authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret))
  )
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
      conversationId,
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

function normalizeNotification(row: NotificationRow) {
  return {
    id: row.id,
    userType: row.user_type,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.is_read,
    link: row.link,
    metadata: row.metadata || null,
    readAt: row.read_at || null,
    expiresAt: row.expires_at || null,
    createdAt: row.created_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    const access = await resolveUserAccess(req)

    if (!access.ok) {
      return jsonError(access.error, access.status)
    }

    const supabase = getSupabaseAdmin()
    const limit = cleanLimit(req.nextUrl.searchParams.get('limit'))
    const unreadOnly = toText(req.nextUrl.searchParams.get('unreadOnly')) === 'true'
    const now = new Date().toISOString()

    let query = (supabase as any)
      .from('notifications')
      .select(
        `
        id,
        user_type,
        user_id,
        title,
        message,
        type,
        is_read,
        link,
        metadata,
        read_at,
        expires_at,
        created_at
        `
      )
      .eq('user_type', access.role)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (access.userId) {
      query = query.or(`user_id.is.null,user_id.eq.${access.userId}`)
    } else {
      query = query.is('user_id', null)
    }

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('NOTIFICATIONS_GET_ERROR', error)
      return jsonError('Bildirimler alınamadı.', 500)
    }

    let countQuery = (supabase as any)
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_type', access.role)
      .eq('is_read', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`)

    if (access.userId) {
      countQuery = countQuery.or(`user_id.is.null,user_id.eq.${access.userId}`)
    } else {
      countQuery = countQuery.is('user_id', null)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('NOTIFICATIONS_UNREAD_COUNT_ERROR', countError)
    }

    return NextResponse.json({
      ok: true,
      notifications: ((data || []) as NotificationRow[]).map(normalizeNotification),
      unreadCount: countError ? 0 : count || 0,
    })
  } catch (error) {
    console.error('NOTIFICATIONS_GET_UNEXPECTED_ERROR', error)

    const message =
      error instanceof Error && error.message === 'SUPABASE_CONFIG_MISSING'
        ? 'Supabase sunucu ayarları eksik.'
        : 'Bildirimler alınamadı.'

    return jsonError(message, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorizedInternalRequest(req)) {
      return jsonError('Bildirim oluşturmak için yetki gerekli.', 401)
    }

    const body = (await req.json().catch(() => null)) as CreateNotificationBody | null

    if (!body || typeof body !== 'object') {
      return jsonError('Geçerli istek gövdesi gerekli.')
    }

    const userType = toText(body.userType)

    if (!isValidUserType(userType)) {
      return jsonError('Geçerli userType gerekli.')
    }

    const userIdText = toText(body.userId)
    const userId = userIdText ? userIdText : null

    if (userId && !isValidUuid(userId)) {
      return jsonError('Geçerli userId gerekli.')
    }

    const title = cleanText(body.title, 120)
    const message = cleanText(body.message, 500)
    const type = normalizeNotificationType(body.type)
    const link = cleanLink(body.link)

    if (!title) {
      return jsonError('Bildirim başlığı gerekli.')
    }

    if (!message) {
      return jsonError('Bildirim mesajı gerekli.')
    }

    const metadata =
      body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
        ? body.metadata
        : null

    const supabase = getSupabaseAdmin()

    const { data, error } = await (supabase as any)
      .from('notifications')
      .insert({
        user_type: userType,
        user_id: userId,
        title,
        message,
        type,
        link,
        metadata,
      })
      .select(
        `
        id,
        user_type,
        user_id,
        title,
        message,
        type,
        is_read,
        link,
        metadata,
        read_at,
        expires_at,
        created_at
        `
      )
      .single()

    if (error) {
      console.error('NOTIFICATIONS_CREATE_ERROR', error)
      return jsonError('Bildirim oluşturulamadı.', 500)
    }

    return NextResponse.json(
      {
        ok: true,
        notification: normalizeNotification(data as NotificationRow),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('NOTIFICATIONS_CREATE_UNEXPECTED_ERROR', error)
    return jsonError('Bildirim oluşturulamadı.', 500)
  }
}
