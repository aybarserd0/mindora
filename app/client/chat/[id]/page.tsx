'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type UserType = 'client' | 'expert' | 'admin'

type Conversation = {
  id: string
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  conversation_id: string
  sender_type: UserType
  sender_name: string | null
  message: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
}

type TypingPayload = {
  senderType: UserType
  senderName: string
  isTyping: boolean
}

type PresenceMeta = {
  userType?: UserType
  userName?: string
  onlineAt?: string
  conversationId?: string
}

type OnlineUsers = {
  expert: boolean
  admin: boolean
}

type ReadState = Record<UserType, string | null>

function formatDate(date?: string | null) {
  if (!date) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

function getSenderName(message: Message) {
  if (message.sender_type === 'client') return 'Siz'
  if (message.sender_type === 'expert') return 'Uzman'
  return 'Mindora'
}

function getPaymentText(status?: string) {
  if (status === 'paid') return 'Ödeme tamamlandı'
  if (status === 'pending') return 'Ödeme bekleniyor'
  if (status === 'failed') return 'Ödeme başarısız'
  if (status === 'refunded') return 'Ödeme iade edildi'
  return '-'
}

function getTypingText(senderType: UserType) {
  if (senderType === 'expert') return 'Uzman yazıyor...'
  if (senderType === 'admin') return 'Mindora yazıyor...'
  return 'Danışan yazıyor...'
}

function isAfter(readAt?: string | null, messageAt?: string | null) {
  if (!readAt || !messageAt) return false
  return new Date(readAt).getTime() > new Date(messageAt).getTime()
}

function getMessageStatus(item: Message, reads: ReadState) {
  if (item.sender_type !== 'client') return null

  const expertSeen = isAfter(reads.expert, item.created_at)
  const adminSeen = isAfter(reads.admin, item.created_at)

  if (expertSeen) return 'Görüldü'
  if (adminSeen) return 'Mindora gördü'

  return 'Gönderildi'
}

export default function ClientChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { showToast } = useToast()
  const searchParams = useSearchParams()

  const [conversationId, setConversationId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [accessLoading, setAccessLoading] = useState(true)
  const [accessVerified, setAccessVerified] = useState(false)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [blockedError, setBlockedError] = useState('')
  const [typingUser, setTypingUser] = useState<TypingPayload | null>(null)
  const [readSynced, setReadSynced] = useState(false)

  const [reads, setReads] = useState<ReadState>({
    client: null,
    expert: null,
    admin: null,
  })

  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({
    expert: false,
    admin: false,
  })

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  const isActive =
    conversation?.status === 'active' && conversation?.payment_status === 'paid'

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  function getAccessToken() {
    return searchParams.get('token') || ''
  }

  function getEncodedAccessToken() {
    return encodeURIComponent(getAccessToken())
  }

  function getMessagesUrl(id: string) {
    return `/api/conversations/${id}/messages?role=client&token=${getEncodedAccessToken()}`
  }

  function getReadsUrl(id: string) {
    return `/api/conversations/${id}/reads?role=client&token=${getEncodedAccessToken()}`
  }

  function hasValidAccessToken() {
    return getAccessToken().trim().length > 0
  }

  async function verifyAccess(id: string) {
    try {
      setAccessLoading(true)
      setAccessVerified(false)
      setError('')

      const token = getAccessToken()

      if (!token) {
        setError(
          'Bu güvenli görüşmeye erişim için geçerli bir token gerekiyor. Link eksik veya bozulmuş olabilir.'
        )
        return false
      }

      const res = await fetch('/api/chat-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          conversationId: id,
          role: 'client',
          token,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            'Bu güvenli görüşmeye erişim yetkiniz bulunmuyor. Link süresi dolmuş veya geçersiz olabilir.'
        )
        return false
      }

      setAccessVerified(true)
      return true
    } catch (err) {
      console.error('CLIENT ACCESS VERIFY ERROR:', err)
      setError('Erişim doğrulanırken hata oluştu.')
      return false
    } finally {
      setAccessLoading(false)
    }
  }

  async function loadReadState(id: string) {
    try {
      if (!id) return
      if (!accessVerified) return
      if (!hasValidAccessToken()) return

      const res = await fetch(getReadsUrl(id), {
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error(
          'CLIENT READ STATE ERROR:',
          data?.error || 'Read state could not be loaded'
        )
        return
      }

      if (data.reads) {
        setReads({
          client: data.reads.client || null,
          expert: data.reads.expert || null,
          admin: data.reads.admin || null,
        })
      }
    } catch (err) {
      console.error('CLIENT READ STATE ERROR:', err)
    }
  }

  async function markConversationAsRead(id: string) {
    try {
      if (!id) return
      if (!accessVerified) return
      if (!hasValidAccessToken()) return

      setReadSynced(false)

      const res = await fetch(`/api/conversations/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          userType: 'client',
          token: getAccessToken(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error('CLIENT READ SYNC ERROR:', data?.error || 'Read sync failed')
        return
      }

      await loadReadState(id)
      setReadSynced(true)
    } catch (err) {
      console.error('CLIENT READ SYNC ERROR:', err)
    }
  }

  async function loadMessages(id: string, showLoading = false) {
    try {
      if (!id) return
      if (!accessVerified) return
      if (!hasValidAccessToken()) return

      if (showLoading) setLoading(true)
      setError('')

      const res = await fetch(getMessagesUrl(id), {
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Konuşma alınamadı.')
        return
      }

      setConversation(data.conversation)
      setMessages(data.messages || [])

      await markConversationAsRead(id)
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function broadcastTyping(isTyping: boolean) {
    if (!channelRef.current) return
    if (!conversationId) return
    if (!accessVerified) return

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          senderType: 'client',
          senderName: 'Danışan',
          isTyping,
        } satisfies TypingPayload,
      })
    } catch (err) {
      console.error('CLIENT TYPING BROADCAST ERROR:', err)
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value)

    if (!isActive || !accessVerified) return

    broadcastTyping(value.trim().length > 0)

    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current)
    }

    localTypingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false)
    }, 2500)
  }

  async function sendMessage() {
    const cleanMessage = message.trim()

    if (!cleanMessage) return
    if (!conversationId) return

    if (!accessVerified || !hasValidAccessToken()) {
      setBlockedError('Bu görüşmeye erişim doğrulanamadı.')
      return
    }

    try {
      setSending(true)
      setBlockedError('')
      await broadcastTyping(false)

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          senderType: 'client',
          senderName: 'Danışan',
          message: cleanMessage,
          role: 'client',
          token: getAccessToken(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setBlockedError(data?.error || 'Mesaj gönderilemedi.')
        await loadMessages(conversationId, false)
        return
      }

      setMessage('')
      await loadMessages(conversationId, false)
    } catch {
      setBlockedError('Mesaj gönderilirken hata oluştu.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      const resolved = await params
      const id = resolved.id

      if (cancelled) return

      setConversationId(id)

      const verified = await verifyAccess(id)

      if (cancelled) return

      if (!verified) {
        setLoading(false)
        return
      }

      await loadMessages(id, true)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [params, searchParams])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUser])

  useEffect(() => {
    if (!conversationId) return
    if (!accessVerified) return

    let isMounted = true

    try {
      const supabase = createMindoraRealtimeClient()

      const channel = supabase
        .channel(`mindora-conversation-${conversationId}`, {
          config: {
            broadcast: {
              self: false,
            },
            presence: {
              key: `client-${conversationId}`,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return

          const presenceState = channel.presenceState()
          let expertOnline = false
          let adminOnline = false

          Object.values(presenceState).forEach((presences) => {
            presences.forEach((presence) => {
              const meta = presence as PresenceMeta

              if (meta.userType === 'expert') expertOnline = true
              if (meta.userType === 'admin') adminOnline = true
            })
          })

          setOnlineUsers({
            expert: expertOnline,
            admin: adminOnline,
          })
        })
        .on(
          'broadcast',
          { event: 'typing' },
          ({ payload }: { payload: TypingPayload }) => {
            if (!isMounted) return
            if (!payload) return
            if (payload.senderType === 'client') return

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }

            if (payload.isTyping) {
              setTypingUser(payload)

              typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null)
              }, 3500)
            } else {
              setTypingUser(null)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            if (!isMounted) return

            const newMessage = payload.new as Message

            setTypingUser(null)

            if (newMessage.sender_type !== 'client') {
              showToast(
                newMessage.sender_type === 'expert'
                  ? 'Uzmandan yeni mesaj'
                  : 'Mindora’dan yeni mesaj',
                'Güvenli görüşmede yeni bir mesaj var.',
                'info'
              )
            }

            await loadMessages(conversationId, false)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
            filter: `id=eq.${conversationId}`,
          },
          async () => {
            if (!isMounted) return
            await loadMessages(conversationId, false)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_reads',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async () => {
            if (!isMounted) return
            await loadReadState(conversationId)
          }
        )
        .subscribe(async (status) => {
          if (!isMounted) return

          if (status === 'SUBSCRIBED') {
            setRealtimeReady(true)

            await channel.track({
              userType: 'client',
              userName: 'Danışan',
              onlineAt: new Date().toISOString(),
              conversationId,
            } satisfies PresenceMeta)

            await loadReadState(conversationId)
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            setRealtimeReady(false)
            setOnlineUsers({
              expert: false,
              admin: false,
            })
          }
        })

      channelRef.current = channel

      return () => {
        isMounted = false
        setRealtimeReady(false)
        setTypingUser(null)
        setReadSynced(false)
        setOnlineUsers({
          expert: false,
          admin: false,
        })
        channelRef.current = null

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        if (localTypingTimeoutRef.current) {
          clearTimeout(localTypingTimeoutRef.current)
        }

        channel.untrack()
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.error('CLIENT REALTIME ERROR:', err)
      setRealtimeReady(false)
      setOnlineUsers({
        expert: false,
        admin: false,
      })
    }
  }, [conversationId, accessVerified, showToast])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-[#171717] md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Güvenli Görüşme
              </p>

              <h1 className="mt-2 text-2xl font-black text-[#2b2118] md:text-3xl">
                Danışan Chat Alanı
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                Uzmanınızla iletişim yalnızca Mindora üzerinden yürütülür.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    accessVerified
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-orange-50 text-orange-700 ring-orange-100'
                  }`}
                >
                  Erişim: {accessVerified ? 'Doğrulandı' : 'Kontrol ediliyor'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    realtimeReady
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      : 'bg-orange-50 text-orange-700 ring-1 ring-orange-100'
                  }`}
                >
                  Realtime: {realtimeReady ? 'Aktif' : 'Bağlanıyor'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    onlineUsers.expert
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {onlineUsers.expert ? 'Uzman çevrimiçi' : 'Uzman çevrimdışı'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    onlineUsers.admin
                      ? 'bg-purple-50 text-purple-700 ring-purple-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {onlineUsers.admin ? 'Mindora aktif' : 'Mindora çevrimdışı'}
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  Secure Token Aktif
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    readSynced
                      ? 'bg-blue-50 text-blue-700 ring-blue-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {readSynced ? 'Okundu senkron' : 'Okundu bekliyor'}
                </span>
              </div>
            </div>

            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-center text-sm font-black text-[#2b2118] transition hover:bg-[#f0e8df]"
            >
              Ana Sayfa
            </Link>
          </div>

          {conversation && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Chat
                </p>
                <p className="mt-2 text-lg font-black text-[#2b2118]">
                  {conversation.status === 'active'
                    ? 'Aktif'
                    : conversation.status === 'locked'
                      ? 'Kilitli'
                      : 'Kapalı'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Ödeme
                </p>
                <p className="mt-2 text-lg font-black text-green-700">
                  {getPaymentText(conversation.payment_status)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Güvenlik
                </p>
                <p className="mt-2 text-lg font-black text-purple-700">
                  Token Korumalı
                </p>
              </div>
            </div>
          )}
        </header>

        {loading || accessLoading ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Güvenli erişim doğrulanıyor...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[2rem] bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="text-lg font-black text-red-700">Erişim reddedildi</p>
            <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-[#e5d9cc] bg-white shadow-sm">
            {!isActive && (
              <div className="border-b border-orange-100 bg-orange-50 p-5">
                <p className="text-lg font-black text-orange-800">
                  🔒 Chat şu anda kilitli
                </p>

                <p className="mt-2 text-sm font-semibold text-orange-700">
                  Platform içi mesajlaşma ödeme tamamlandıktan sonra aktif olur.
                </p>
              </div>
            )}

            <div className="flex h-[520px] flex-col overflow-y-auto bg-[#faf7f2] p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-3xl bg-white p-6 text-center ring-1 ring-black/5">
                    <p className="text-lg font-black text-[#2b2118]">
                      Henüz mesaj yok
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                      Chat aktif olduğunda uzmanınızla güvenli şekilde buradan
                      mesajlaşabilirsiniz.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-auto space-y-4">
                  {messages.map((item) => {
                    const isMine = item.sender_type === 'client'
                    const isAdmin = item.sender_type === 'admin'
                    const messageStatus = getMessageStatus(item, reads)

                    return (
                      <div
                        key={item.id}
                        className={`flex ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl p-4 text-sm shadow-sm ${
                            isMine
                              ? 'bg-black text-white'
                              : isAdmin
                                ? 'bg-purple-50 text-purple-950 ring-1 ring-purple-100'
                                : 'bg-white text-[#2b2118] ring-1 ring-black/10'
                          }`}
                        >
                          <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] opacity-70">
                            {getSenderName(item)}
                          </p>

                          <p className="whitespace-pre-wrap break-words leading-6">
                            {item.message}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold opacity-70">
                            <span>{formatDate(item.created_at)}</span>

                            {messageStatus && (
                              <span
                                className={`font-black ${
                                  messageStatus === 'Görüldü'
                                    ? 'text-emerald-300'
                                    : 'text-white/70'
                                }`}
                              >
                                {messageStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {typingUser && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#6b5c4d] shadow-sm ring-1 ring-black/10">
                        <span className="inline-flex items-center gap-1">
                          {getTypingText(typingUser.senderType)}
                          <span className="ml-1 inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8a7662]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8a7662] [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8a7662] [animation-delay:240ms]" />
                          </span>
                        </span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {blockedError && (
              <div className="border-t border-red-100 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">
                  {blockedError}
                </p>
              </div>
            )}

            <div className="border-t border-black/10 bg-white p-4">
              <div className="mb-3 rounded-2xl bg-[#faf7f2] p-3 text-xs font-semibold text-[#6b5c4d] ring-1 ring-black/5">
                Telefon, e-posta, WhatsApp, Instagram, Telegram, IBAN veya
                platform dışı ödeme bilgisi paylaşmayınız.
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <textarea
                  value={message}
                  onChange={(event) => handleMessageChange(event.target.value)}
                  disabled={!isActive || !accessVerified || sending}
                  rows={3}
                  maxLength={2000}
                  placeholder={
                    isActive
                      ? 'Mesajınızı yazın...'
                      : 'Ödeme tamamlandıktan sonra mesajlaşma aktif olur.'
                  }
                  className="min-h-24 flex-1 resize-none rounded-2xl border border-black/10 bg-[#faf7f2] p-4 text-sm font-semibold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  onClick={sendMessage}
                  disabled={
                    !isActive || !accessVerified || sending || !message.trim()
                  }
                  className="rounded-2xl bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50 md:w-40"
                >
                  {sending ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>

              <p className="mt-2 text-xs font-semibold text-[#8a7662]">
                {message.length}/2000 karakter
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}