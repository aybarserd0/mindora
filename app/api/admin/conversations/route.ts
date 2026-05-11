import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { generateSecureToken } from '@/lib/chat-access-tokens'

type Conversation = {
  id: string
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

type Message = {
  conversation_id: string
  sender_type: 'client' | 'expert' | 'admin'
  sender_name: string | null
  message: string
  created_at: string
}

type AccessRole = 'client' | 'expert'

type AccessTokenRow = {
  id?: string
  conversation_id?: string | null
  conversationId?: string | null
  token?: string | null
  access_token?: string | null
  accessToken?: string | null
  user_type?: string | null
  userType?: string | null
  role?: string | null
  type?: string | null
  access_type?: string | null
  participant_type?: string | null
  revoked?: boolean | null
  expires_at?: string | null
}

type TokenPair = {
  client?: string
  expert?: string
}

const TOKEN_TTL_HOURS = 24 * 7

function normalizeRole(row: AccessTokenRow): AccessRole | null {
  const rawRole =
    row.user_type ||
    row.userType ||
    row.role ||
    row.type ||
    row.access_type ||
    row.participant_type ||
    ''

  const role = String(rawRole).toLowerCase().trim()

  if (role === 'client' || role === 'danisan' || role === 'danışan') {
    return 'client'
  }

  if (
    role === 'expert' ||
    role === 'uzman' ||
    role === 'psychologist' ||
    role === 'therapist'
  ) {
    return 'expert'
  }

  return null
}

function getTokenValue(row: AccessTokenRow) {
  return row.token || row.access_token || row.accessToken || ''
}

function getConversationIdValue(row: AccessTokenRow) {
  return row.conversation_id || row.conversationId || ''
}

function getSafeTime(value?: string | null) {
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isTokenUsable(row: AccessTokenRow) {
  if (row.revoked === true) return false

  if (!row.expires_at) return true

  const expiresAt = new Date(row.expires_at).getTime()
  if (Number.isNaN(expiresAt)) return true

  return expiresAt > Date.now()
}

function createExpiresAt() {
  return new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString()
}

async function ensureConversationAccessToken({
  supabase,
  conversationId,
  role,
}: {
  supabase: any
  conversationId: string
  role: AccessRole
}) {
  const token = generateSecureToken()
  const expiresAt = createExpiresAt()

  const { data, error } = await supabase
    .from('conversation_access_tokens')
    .insert({
      conversation_id: conversationId,
      role,
      token,
      expires_at: expiresAt,
      revoked: false,
    })
    .select('token')
    .single()

  if (error) {
    console.error('ADMIN AUTO TOKEN CREATE ERROR:', {
      conversationId,
      role,
      error,
    })

    return null
  }

  return data?.token || token
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id,status,payment_status,created_at,updated_at')
      .order('updated_at', { ascending: false })

    if (conversationsError) {
      return NextResponse.json(
        { ok: false, error: conversationsError.message },
        { status: 500 }
      )
    }

    const conversationList = ((conversations || []) as unknown) as Conversation[]

    if (conversationList.length === 0) {
      return NextResponse.json({
        ok: true,
        conversations: [],
      })
    }

    const conversationIds = conversationList.map((item) => item.id)

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id,sender_type,sender_name,message,created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })

    if (messagesError) {
      return NextResponse.json(
        { ok: false, error: messagesError.message },
        { status: 500 }
      )
    }

    const { data: accessTokens, error: accessTokensError } = await (
      supabase as any
    )
      .from('conversation_access_tokens')
      .select('*')
      .in('conversation_id', conversationIds)

    if (accessTokensError) {
      return NextResponse.json(
        { ok: false, error: accessTokensError.message },
        { status: 500 }
      )
    }

    const lastMessageMap = new Map<string, Message>()

    ;(((messages || []) as unknown) as Message[]).forEach((message) => {
      if (!lastMessageMap.has(message.conversation_id)) {
        lastMessageMap.set(message.conversation_id, message)
      }
    })

    const tokenMap = new Map<string, TokenPair>()

    ;(((accessTokens || []) as unknown) as AccessTokenRow[]).forEach((row) => {
      if (!isTokenUsable(row)) return

      const conversationId = getConversationIdValue(row)
      const role = normalizeRole(row)
      const token = getTokenValue(row)

      if (!conversationId || !role || !token) return

      const existing = tokenMap.get(conversationId) || {}

      if (role === 'client') {
        existing.client = token
      }

      if (role === 'expert') {
        existing.expert = token
      }

      tokenMap.set(conversationId, existing)
    })

    for (const conversation of conversationList) {
      const existing = tokenMap.get(conversation.id) || {}

      if (!existing.client) {
        const clientToken = await ensureConversationAccessToken({
          supabase,
          conversationId: conversation.id,
          role: 'client',
        })

        if (clientToken) {
          existing.client = clientToken
        }
      }

      if (!existing.expert) {
        const expertToken = await ensureConversationAccessToken({
          supabase,
          conversationId: conversation.id,
          role: 'expert',
        })

        if (expertToken) {
          existing.expert = expertToken
        }
      }

      tokenMap.set(conversation.id, existing)
    }

    const conversationsWithPreview = conversationList
      .map((conversation) => {
        const lastMessage = lastMessageMap.get(conversation.id)
        const tokens = tokenMap.get(conversation.id)

        return {
          ...conversation,

          clientAccessToken: tokens?.client || null,
          expertAccessToken: tokens?.expert || null,

          last_message: lastMessage?.message || null,
          last_message_sender: lastMessage?.sender_type || null,
          last_message_sender_name: lastMessage?.sender_name || null,
          last_message_at: lastMessage?.created_at || null,
        }
      })
      .sort((a, b) => {
        const aTime = getSafeTime(a.last_message_at || a.updated_at)
        const bTime = getSafeTime(b.last_message_at || b.updated_at)

        return bTime - aTime
      })

    return NextResponse.json({
      ok: true,
      conversations: conversationsWithPreview,
    })
  } catch (err) {
    console.error('ADMIN CONVERSATIONS ERROR:', err)

    return NextResponse.json(
      { ok: false, error: 'Beklenmeyen sunucu hatası.' },
      { status: 500 }
    )
  }
}