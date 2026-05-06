'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type SenderType = 'client' | 'expert' | 'admin'

type Conversation = {
  id: string
  client_application_id: string
  expert_id: string
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  conversation_id: string
  sender_type: SenderType
  sender_name: string | null
  message: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
}

type TypingPayload = {
  senderType: SenderType
  senderName: string
  isTyping: boolean
}

type PresenceMeta = {
  userType?: SenderType
  userName?: string
  onlineAt?: string
  conversationId?: string
}

type OnlineUsers = {
  client: boolean
  expert: boolean
}

function formatDate(date?: string | null) {
  if (!date) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

function getStatusLabel(status?: string) {
  if (status === 'active') return 'Aktif'
  if (status === 'locked') return 'Kilitli'
  if (status === 'closed') return 'Kapalı'
  return '-'
}

function getPaymentLabel(status?: string) {
  if (status === 'paid') return 'Ödendi'
  if (status === 'pending') return 'Ödeme Bekliyor'
  if (status === 'failed') return 'Başarısız'
  if (status === 'refunded') return 'İade'
  return '-'
}

function getSenderLabel(sender: SenderType) {
  if (sender === 'client') return 'Danışan'
  if (sender === 'expert') return 'Uzman'
  return 'Admin'
}

function getSenderName(sender: SenderType) {
  if (sender === 'admin') return 'Mindora Admin'
  if (sender === 'expert') return 'Uzman'
  return 'Danışan'
}

function getTypingText(senderType: SenderType) {
  if (senderType === 'client') return 'Danışan yazıyor...'
  if (senderType === 'expert') return 'Uzman yazıyor...'
  return 'Mindora yazıyor...'
}

function getSenderStyle(sender: SenderType) {
  if (sender === 'admin') return 'ml-auto bg-black text-white'
  if (sender === 'expert')
    return 'mr-auto bg-purple-50 text-purple-950 ring-1 ring-purple-100'
  return 'mr-auto bg-white text-[#2b2118] ring-1 ring-black/10'
}

export default function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [conversationId, setConversationId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [senderType, setSenderType] = useState<SenderType>('admin')
  const [loading, setLoading] = useState(true)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [typingUser, setTypingUser] = useState<TypingPayload | null>(null)
  const [readSynced, setReadSynced] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({
    client: false,
    expert: false,
  })

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  const flaggedMessages = useMemo(
    () => messages.filter((item) => item.is_flagged),
    [messages]
  )

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  async function markConversationAsRead(id: string) {
    try {
      setReadSynced(false)

      const res = await fetch(`/api/conversations/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userType: 'admin' }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error('ADMIN READ SYNC ERROR:', data?.error || 'Read sync failed')
        return
      }

      setReadSynced(true)
    } catch (err) {
      console.error('ADMIN READ SYNC ERROR:', err)
    }
  }

  async function loadMessages(id: string, showLoading = true) {
    try {
      if (showLoading) setLoading(true)
      setError('')

      const res = await fetch(`/api/conversations/${id}/messages`, {
        cache: 'no-store',
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Konuşma alınamadı.')
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

  async function broadcastTyping(activeSenderType: SenderType, isTyping: boolean) {
    if (!channelRef.current) return
    if (!conversationId) return

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          senderType: activeSenderType,
          senderName: getSenderName(activeSenderType),
          isTyping,
        } satisfies TypingPayload,
      })
    } catch (err) {
      console.error('ADMIN TYPING BROADCAST ERROR:', err)
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value)

    broadcastTyping(senderType, value.trim().length > 0)

    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current)
    }

    localTypingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(senderType, false)
    }, 2500)
  }

  async function sendMessage() {
    const cleanMessage = message.trim()

    if (!cleanMessage) {
      alert('Mesaj boş olamaz.')
      return
    }

    if (!conversationId) {
      alert('Conversation ID bulunamadı.')
      return
    }

    try {
      setSending(true)
      await broadcastTyping(senderType, false)

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderType,
          senderName: getSenderName(senderType),
          message: cleanMessage,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert(data.error || 'Mesaj gönderilemedi.')
        await loadMessages(conversationId, false)
        return
      }

      setMessage('')
      await loadMessages(conversationId, false)
    } catch {
      alert('Mesaj gönderilirken hata oluştu.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    async function init() {
      const resolved = await params
      setConversationId(resolved.id)
      await loadMessages(resolved.id)
    }

    init()
  }, [params])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUser])

  useEffect(() => {
    if (!conversationId) return

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
              key: `admin-${conversationId}`,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return

          const presenceState = channel.presenceState()
          let clientOnline = false
          let expertOnline = false

          Object.values(presenceState).forEach((presences) => {
            presences.forEach((presence) => {
              const meta = presence as PresenceMeta

              if (meta.userType === 'client') clientOnline = true
              if (meta.userType === 'expert') expertOnline = true
            })
          })

          setOnlineUsers({
            client: clientOnline,
            expert: expertOnline,
          })
        })
        .on(
          'broadcast',
          { event: 'typing' },
          ({ payload }: { payload: TypingPayload }) => {
            if (!isMounted) return
            if (!payload) return
            if (payload.senderType === 'admin') return

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
          async () => {
            if (!isMounted) return
            setTypingUser(null)
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
        .subscribe(async (status) => {
          if (!isMounted) return

          if (status === 'SUBSCRIBED') {
            setRealtimeReady(true)

            await channel.track({
              userType: 'admin',
              userName: 'Mindora Admin',
              onlineAt: new Date().toISOString(),
              conversationId,
            } satisfies PresenceMeta)
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            setRealtimeReady(false)
            setOnlineUsers({
              client: false,
              expert: false,
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
          client: false,
          expert: false,
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
      console.error('ADMIN REALTIME ERROR:', err)
      setRealtimeReady(false)
      setOnlineUsers({
        client: false,
        expert: false,
      })
    }
  }, [conversationId])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-6 py-10 text-[#171717]">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <div className="mb-6">
          <Link
            href="/admin/danisan-basvurulari"
            className="text-sm font-black text-[#6b5c4d] underline underline-offset-4"
          >
            ← Danışan başvurularına dön
          </Link>
        </div>

        <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Moderasyon
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
                Konuşma Detayı
              </h1>

              <p className="mt-2 max-w-2xl break-all text-sm font-semibold text-[#6b5c4d]">
                Conversation ID: {conversationId || '-'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
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
                    onlineUsers.client
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {onlineUsers.client
                    ? 'Danışan çevrimiçi'
                    : 'Danışan çevrimdışı'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    onlineUsers.expert
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {onlineUsers.expert
                    ? 'Uzman çevrimiçi'
                    : 'Uzman çevrimdışı'}
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  Mindora Aktif
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

            <button
              onClick={() => conversationId && loadMessages(conversationId)}
              disabled={loading}
              className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Yenile
            </button>
          </div>

          {conversation && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Chat Durumu
                </p>
                <p className="mt-2 text-xl font-black text-[#2b2118]">
                  {getStatusLabel(conversation.status)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Ödeme
                </p>
                <p className="mt-2 text-xl font-black text-green-700">
                  {getPaymentLabel(conversation.payment_status)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Mesaj
                </p>
                <p className="mt-2 text-xl font-black text-[#2b2118]">
                  {messages.length}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
                  Flagged
                </p>
                <p className="mt-2 text-xl font-black text-red-700">
                  {flaggedMessages.length}
                </p>
              </div>
            </div>
          )}
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">Konuşma yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-black/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-[#2b2118]">
                    Mesaj Akışı
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[#6b5c4d]">
                    Platform içi iletişim ve kaçak iletişim kontrolleri.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex max-h-[560px] min-h-[420px] flex-col overflow-y-auto rounded-2xl bg-[#faf7f2] p-4">
                {messages.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/5">
                    <p className="font-bold text-[#6b5c4d]">
                      Henüz mesaj yok.
                    </p>
                  </div>
                ) : (
                  <div className="mt-auto space-y-4">
                    {messages.map((item) => (
                      <div key={item.id} className="flex">
                        <div
                          className={`max-w-[82%] rounded-2xl p-4 text-sm shadow-sm ${getSenderStyle(
                            item.sender_type
                          )}`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-[0.15em] opacity-80">
                              {getSenderLabel(item.sender_type)}
                            </span>

                            {item.sender_name && (
                              <span className="text-xs font-bold opacity-70">
                                {item.sender_name}
                              </span>
                            )}

                            {item.is_flagged && (
                              <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                                🚨 FLAGGED
                              </span>
                            )}
                          </div>

                          <p className="whitespace-pre-wrap break-words leading-6">
                            {item.message}
                          </p>

                          {item.is_flagged && (
                            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 ring-1 ring-red-100">
                              Sebep: {item.flag_reason || 'contact_leak'}
                            </div>
                          )}

                          <p className="mt-3 text-[11px] font-semibold opacity-60">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {typingUser && (
                      <div className="flex">
                        <div className="mr-auto rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#6b5c4d] shadow-sm ring-1 ring-black/10">
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

              <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
                <div className="mb-3 flex flex-col gap-3 md:flex-row">
                  <select
                    value={senderType}
                    onChange={(event) => {
                      broadcastTyping(senderType, false)
                      setSenderType(event.target.value as SenderType)
                    }}
                    className="h-11 rounded-full border border-black/10 bg-[#faf7f2] px-4 text-sm font-black outline-none"
                  >
                    <option value="admin">Admin olarak gönder</option>
                    <option value="client">Danışan gibi test et</option>
                    <option value="expert">Uzman gibi test et</option>
                  </select>

                  <button
                    onClick={sendMessage}
                    disabled={sending || !message.trim()}
                    className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto"
                  >
                    {sending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                  </button>
                </div>

                <textarea
                  value={message}
                  onChange={(event) => handleMessageChange(event.target.value)}
                  placeholder="Admin mesajı yaz... Telefon, e-posta, WhatsApp, IBAN gibi bilgiler client/expert testinde flaglenir."
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-2xl border border-black/10 bg-[#faf7f2] p-4 text-sm font-semibold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30"
                />

                <p className="mt-2 text-xs font-semibold text-[#8a7662]">
                  {message.length}/2000 karakter
                </p>
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 shadow-sm">
                <h3 className="text-lg font-black text-red-800">
                  Moderasyon Özeti
                </h3>

                <p className="mt-2 text-sm font-semibold text-red-700">
                  Flagged mesajlar platform dışı kaçış veya ödeme bypass
                  girişimi olabilir.
                </p>

                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-red-100">
                  <p className="text-sm font-black text-red-800">
                    Flagged Mesaj Sayısı
                  </p>
                  <p className="mt-2 text-3xl font-black text-red-700">
                    {flaggedMessages.length}
                  </p>
                </div>

                {flaggedMessages.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {flaggedMessages.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-white p-3 text-xs font-semibold text-red-900 ring-1 ring-red-100"
                      >
                        <p className="font-black">
                          {getSenderLabel(item.sender_type)} •{' '}
                          {item.flag_reason || 'contact_leak'}
                        </p>
                        <p className="mt-2 line-clamp-3">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-[#2b2118]">
                  Sistem Kuralları
                </h3>

                <div className="mt-4 space-y-3 text-sm font-semibold text-[#6b5c4d]">
                  <p>✅ Admin her zaman mesaj gönderebilir.</p>
                  <p>🔒 Danışan/uzman mesajı için ödeme paid olmalı.</p>
                  <p>
                    🚨 Telefon, e-posta, WhatsApp, Instagram, Telegram, IBAN
                    flaglenir.
                  </p>
                  <p>
                    🛡️ Flagged mesaj DB’ye kaydedilir ama kullanıcıya hata
                    döner.
                  </p>
                  <p>
                    ⚡ Realtime aktifse yeni mesajlar refresh yapmadan düşer.
                  </p>
                  <p>
                    🟢 Presence ile online/offline durumu anlık takip edilir.
                  </p>
                  <p>
                    👁️ Admin ekranı açıldığında mesajlar admin için okundu
                    işaretlenir.
                  </p>
                </div>
              </div>

              {conversation && (
                <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-[#2b2118]">
                    Teknik Bilgi
                  </h3>

                  <div className="mt-4 space-y-2 text-xs font-semibold text-[#6b5c4d]">
                    <p className="break-all">
                      <b>Client Application:</b>{' '}
                      {conversation.client_application_id}
                    </p>
                    <p className="break-all">
                      <b>Expert:</b> {conversation.expert_id}
                    </p>
                    <p>
                      <b>Oluşturuldu:</b> {formatDate(conversation.created_at)}
                    </p>
                    <p>
                      <b>Güncellendi:</b> {formatDate(conversation.updated_at)}
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}