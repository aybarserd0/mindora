import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type Conversation = {
  id: string
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
  client_access_token?: string | null
  expert_access_token?: string | null
}

type Message = {
  conversation_id: string
  sender_type: 'client' | 'expert' | 'admin'
  sender_name: string | null
  message: string
  created_at: string
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(
        [
          'id',
          'status',
          'payment_status',
          'created_at',
          'updated_at',
          'client_access_token',
          'expert_access_token',
        ].join(',')
      )
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

    const lastMessageMap = new Map<string, Message>()

    ;((messages || []) as Message[]).forEach((message) => {
      if (!lastMessageMap.has(message.conversation_id)) {
        lastMessageMap.set(message.conversation_id, message)
      }
    })

    const conversationsWithPreview = conversationList
      .map((conversation) => {
        const lastMessage = lastMessageMap.get(conversation.id)

        return {
          ...conversation,
          clientAccessToken: conversation.client_access_token || null,
          expertAccessToken: conversation.expert_access_token || null,
          last_message: lastMessage?.message || null,
          last_message_sender: lastMessage?.sender_type || null,
          last_message_sender_name: lastMessage?.sender_name || null,
          last_message_at: lastMessage?.created_at || null,
        }
      })
      .sort((a, b) => {
        const aTime = new Date(a.last_message_at || a.updated_at).getTime()
        const bTime = new Date(b.last_message_at || b.updated_at).getTime()

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