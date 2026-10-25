import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'
import { applyRateLimit } from '@/lib/security/rate-limit'

type UserType = 'client' | 'expert'

type SessionStatus =
  | 'scheduled'
  | 'waiting'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'no_show'

type ConversationRecord = {
  id: string
  client_application_id: string | null
  expert_id: string | null
  status: string
  payment_status: string | null
}

type SessionRecord = {
  id: string
  conversation_id: string
  client_application_id: string | null
  expert_id: string | null
  status: SessionStatus | string
  room_name: string | null
  scheduled_at: string | null
  started_at?: string | null
  conversations: ConversationRecord | ConversationRecord[] | null
}

type SessionAccessTokenRecord = {
  id: string
  session_id: string
  booking_id: string | null
  conversation_id: string | null
  user_type: string
  token: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUserType(value: string): value is UserType {
  return value === 'client' || value === 'expert'
}

function isJoinableSessionStatus(status: SessionStatus | string) {
  return status === 'scheduled' || status === 'waiting' || status === 'active'
}

function createSafeIdentity(
  userType: UserType,
  participantName: string,
  sessionId: string
) {
  const safeName =
    participantName
      .toLowerCase()
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'user'

  return `${userType}-${safeName}-${sessionId.slice(0, 8)}`
}

function normalizeConversation(
  value: ConversationRecord | ConversationRecord[] | null
) {
  if (Array.isArray(value)) return value[0] || null
  return value
}

function getPublicLivekitUrl(rawUrl: string) {
  const url = rawUrl.trim()
  if (!url) return ''
  return url
}

async function resolveDisplayName(userType: UserType, session: SessionRecord, fallback: string) {
  const supabase = getSupabaseAdmin()
  const generic = userType === 'expert' ? 'Uzman' : 'Danışan'
  const isPlaceholder = !fallback || /^(client|expert)-user$/i.test(fallback)

  try {
    if (userType === 'expert' && session.expert_id) {
      const { data } = await supabase.from('experts').select('name').eq('id', session.expert_id).maybeSingle()
      if (data?.name) return data.name
    }
    if (userType === 'client' && session.client_application_id) {
      const { data } = await supabase
        .from('client_applications')
        .select('name')
        .eq('id', session.client_application_id)
        .maybeSingle()
      if (data?.name) return data.name
    }
  } catch (error) {
    console.error('LIVEKIT_DISPLAY_NAME_ERROR', error)
  }

  return isPlaceholder ? generic : fallback
}

async function markSessionWaitingIfNeeded(sessionId: string) {
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'waiting',
    })
    .eq('id', sessionId)
    .eq('status', 'scheduled')

  if (error) {
    console.error('LIVEKIT_SESSION_WAITING_UPDATE_ERROR', error)
  }
}

async function markSessionActiveIfNeeded(sessionId: string) {
  const supabase = getSupabaseAdmin()
  const now = new Date().toISOString()

  const { error } = await supabase
    .from('sessions')
    .update({
      status: 'active',
      started_at: now,
    })
    .eq('id', sessionId)
    .in('status', ['scheduled', 'waiting'])
    .is('started_at', null)

  if (error) {
    console.error('LIVEKIT_SESSION_ACTIVE_UPDATE_ERROR', error)
  }
}

async function verifySessionAccessToken({
  token,
  sessionId,
  conversationId,
  userType,
}: {
  token: string
  sessionId: string
  conversationId: string
  userType: UserType
}) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('session_access_tokens' as never)
    .select('*')
    .eq('token', token as never)
    .eq('session_id', sessionId as never)
    .eq('user_type', userType as never)
    .maybeSingle()

  if (error) {
    console.error('LIVEKIT_SESSION_ACCESS_TOKEN_QUERY_ERROR', error)
    return {
      ok: false,
      reason: 'query_error',
    }
  }

  const access = data as unknown as SessionAccessTokenRecord | null

  if (!access) {
    return {
      ok: false,
      reason: 'not_found',
    }
  }

  if (access.revoked_at) {
    return {
      ok: false,
      reason: 'revoked',
    }
  }

  if (new Date(access.expires_at).getTime() <= Date.now()) {
    return {
      ok: false,
      reason: 'expired',
    }
  }

  if (access.conversation_id && access.conversation_id !== conversationId) {
    return {
      ok: false,
      reason: 'conversation_mismatch',
    }
  }

  if (!access.used_at) {
    const { error: usedError } = await supabase
      .from('session_access_tokens' as never)
      .update({
        used_at: new Date().toISOString(),
      } as never)
      .eq('id', access.id as never)

    if (usedError) {
      console.error('LIVEKIT_SESSION_ACCESS_TOKEN_USED_UPDATE_ERROR', usedError)
    }
  }

  return {
    ok: true,
    reason: 'valid',
  }
}

async function verifyAnyValidAccessToken({
  token,
  sessionId,
  conversationId,
  userType,
}: {
  token: string
  sessionId: string
  conversationId: string
  userType: UserType
}) {
  const sessionAccess = await verifySessionAccessToken({
    token,
    sessionId,
    conversationId,
    userType,
  })

  if (sessionAccess.ok) {
    return {
      ok: true,
      source: 'session_access_tokens',
    }
  }

  const legacyAccess = await verifyConversationAccessToken({
    token,
    conversationId,
    role: userType,
  })

  if (legacyAccess.ok) {
    return {
      ok: true,
      source: 'conversation_access_tokens',
    }
  }

  return {
    ok: false,
    source: 'none',
  }
}

export async function POST(req: NextRequest) {
  try {
    const limited = applyRateLimit(req, { scope: 'livekit-token', limit: 30, windowMs: 60_000 })
    if (limited) return limited

    const body = await req.json().catch(() => null)

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz istek.' },
        { status: 400 }
      )
    }

    const bodyRecord = body as Record<string, unknown>

    const sessionId = toText(bodyRecord.sessionId)
    const participantName = toText(bodyRecord.participantName)
    const userTypeRaw = toText(bodyRecord.userType)
    const accessToken = toText(bodyRecord.token)

    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: 'Görüşme bilgisi eksik.' },
        { status: 400 }
      )
    }

    if (!participantName) {
      return NextResponse.json(
        { ok: false, error: 'Katılımcı bilgisi eksik.' },
        { status: 400 }
      )
    }

    if (!isValidUserType(userTypeRaw)) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz kullanıcı tipi.' },
        { status: 400 }
      )
    }

    if (!accessToken) {
      return NextResponse.json(
        { ok: false, error: 'Güvenli bağlantı anahtarı eksik. Sana gönderilen bağlantıyı kullan.' },
        { status: 401 }
      )
    }

    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET
    const livekitUrl = getPublicLivekitUrl(process.env.LIVEKIT_URL || '')

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error('LIVEKIT_ENV_MISSING', {
        hasApiKey: Boolean(apiKey),
        hasApiSecret: Boolean(apiSecret),
        hasUrl: Boolean(livekitUrl),
      })

      return NextResponse.json(
        { ok: false, error: 'Görüntülü görüşme altyapısı şu anda yapılandırılmamış.' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error: sessionError } = await supabase
      .from('sessions')
      .select(
        `
        id,
        conversation_id,
        client_application_id,
        expert_id,
        status,
        room_name,
        scheduled_at,
        started_at,
        conversations (
          id,
          client_application_id,
          expert_id,
          status,
          payment_status
        )
      `
      )
      .eq('id', sessionId)
      .maybeSingle()

    const session = data as SessionRecord | null

    if (sessionError) {
      console.error('LIVEKIT_SESSION_QUERY_ERROR', sessionError)

      return NextResponse.json(
        { ok: false, error: 'Görüşme bilgisi kontrol edilemedi. Biraz sonra tekrar dene.' },
        { status: 500 }
      )
    }

    if (!session) {
      return NextResponse.json(
        { ok: false, error: 'Görüşme bulunamadı.' },
        { status: 404 }
      )
    }

    if (!isJoinableSessionStatus(session.status)) {
      return NextResponse.json(
        {
          ok: false,
          error: session.status === 'completed' ? 'Bu görüşme sona erdi.' : session.status === 'cancelled' ? 'Bu görüşme iptal edildi.' : 'Bu görüşmeye şu anda katılınamıyor.',
        },
        { status: 403 }
      )
    }

    const conversation = normalizeConversation(session.conversations)

    if (!conversation) {
      return NextResponse.json(
        { ok: false, error: 'Bu görüşmeye ait sohbet bulunamadı.' },
        { status: 404 }
      )
    }

    if (conversation.status !== 'active') {
      return NextResponse.json(
        { ok: false, error: 'Bu sohbet şu anda aktif değil.' },
        { status: 403 }
      )
    }

    if (conversation.payment_status !== 'paid') {
      return NextResponse.json(
        { ok: false, error: 'Görüşmeye katılmak için önce ödemenin tamamlanması gerekiyor.' },
        { status: 402 }
      )
    }

    if (!session.room_name) {
      return NextResponse.json(
        { ok: false, error: 'Görüşme odası henüz hazırlanmadı.' },
        { status: 500 }
      )
    }

    if (session.conversation_id !== conversation.id) {
      return NextResponse.json(
        { ok: false, error: 'Görüşme bilgileri uyuşmuyor.' },
        { status: 409 }
      )
    }

    if (
      session.client_application_id &&
      conversation.client_application_id &&
      session.client_application_id !== conversation.client_application_id
    ) {
      return NextResponse.json(
        { ok: false, error: 'Görüşme bilgileri uyuşmuyor.' },
        { status: 409 }
      )
    }

    if (
      session.expert_id &&
      conversation.expert_id &&
      session.expert_id !== conversation.expert_id
    ) {
      return NextResponse.json(
        { ok: false, error: 'Görüşme bilgileri uyuşmuyor.' },
        { status: 409 }
      )
    }

    const verified = await verifyAnyValidAccessToken({
      token: accessToken,
      sessionId: session.id,
      conversationId: session.conversation_id,
      userType: userTypeRaw,
    })

    if (!verified.ok) {
      return NextResponse.json(
        { ok: false, error: 'Bağlantının süresi dolmuş ya da geçersiz. Yeni bağlantı için Mindora ile iletişime geç.' },
        { status: 401 }
      )
    }

    if (session.status === 'scheduled') {
      await markSessionWaitingIfNeeded(session.id)
    }

    if (session.status === 'waiting') {
      await markSessionActiveIfNeeded(session.id)
    }

    // Görüşmede karşı tarafa görünecek ad istemciden değil kayıttan gelir;
    // sayfalar sabit "client-user"/"expert-user" gönderiyordu ve kutucukta bu yazıyordu
    const displayName = await resolveDisplayName(userTypeRaw, session, participantName)
    const identity = createSafeIdentity(userTypeRaw, displayName, session.id)

    const livekitToken = new AccessToken(apiKey, apiSecret, {
      identity,
      name: displayName.slice(0, 80),
      ttl: '2h',
      metadata: JSON.stringify({
        sessionId: session.id,
        conversationId: session.conversation_id,
        userType: userTypeRaw,
        accessSource: verified.source,
      }),
    })

    livekitToken.addGrant({
      roomJoin: true,
      room: session.room_name,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await livekitToken.toJwt()

    return NextResponse.json({
      ok: true,
      token: jwt,
      url: livekitUrl,
      roomName: session.room_name,
      identity,
      session: {
        id: session.id,
        status:
          session.status === 'scheduled'
            ? 'waiting'
            : session.status === 'waiting'
              ? 'active'
              : session.status,
        scheduledAt: session.scheduled_at,
        startedAt: session.started_at,
      },
    })
  } catch (error) {
    console.error('LIVEKIT_TOKEN_ERROR', error)

    return NextResponse.json(
      { ok: false, error: 'Beklenmeyen bir hata oluştu. Biraz sonra tekrar dene.' },
      { status: 500 }
    )
  }
}
