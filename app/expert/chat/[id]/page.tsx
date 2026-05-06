'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

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
  sender_type: 'client' | 'expert' | 'admin'
  sender_name: string | null
  message: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
}

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
  if (message.sender_type === 'expert') return 'Siz'
  if (message.sender_type === 'client') return 'Danışan'
  return 'Mindora'
}

function getPaymentText(status?: string) {
  if (status === 'paid') return 'Ödeme tamamlandı'
  if (status === 'pending') return 'Ödeme bekleniyor'
  if (status === 'failed') return 'Ödeme başarısız'
  if (status === 'refunded') return 'Ödeme iade edildi'
  return '-'
}

export default function ExpertChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [conversationId, setConversationId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [blockedError, setBlockedError] = useState('')

  const isActive =
    conversation?.status === 'active' && conversation?.payment_status === 'paid'

  async function loadMessages(id: string, showLoading = false) {
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
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function sendMessage() {
    const cleanMessage = message.trim()

    if (!cleanMessage) return
    if (!conversationId) return

    try {
      setSending(true)
      setBlockedError('')

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderType: 'expert',
          senderName: 'Uzman',
          message: cleanMessage,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setBlockedError(data.error || 'Mesaj gönderilemedi.')
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
    async function init() {
      const resolved = await params
      setConversationId(resolved.id)
      await loadMessages(resolved.id, true)
    }

    init()
  }, [params])

  useEffect(() => {
    if (!conversationId) return

    let isMounted = true

    try {
      const supabase = createMindoraRealtimeClient()

      const channel = supabase
        .channel(`expert-chat-${conversationId}`)
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
        .subscribe((status) => {
          if (isMounted && status === 'SUBSCRIBED') {
            setRealtimeReady(true)
          }
        })

      return () => {
        isMounted = false
        setRealtimeReady(false)
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.error('EXPERT REALTIME ERROR:', err)
      setRealtimeReady(false)
    }
  }, [conversationId])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-[#171717] md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Uzman Paneli
              </p>

              <h1 className="mt-2 text-2xl font-black text-[#2b2118] md:text-3xl">
                Uzman Chat Alanı
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                Danışanla iletişim yalnızca Mindora güvenli platformu üzerinden
                yürütülür.
              </p>

              <p className="mt-2 text-xs font-black text-[#8a7662]">
                Realtime:{' '}
                <span
                  className={
                    realtimeReady ? 'text-emerald-700' : 'text-orange-700'
                  }
                >
                  {realtimeReady ? 'Aktif' : 'Bağlanıyor / Pasif'}
                </span>
              </p>
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
                  No-Leak Aktif
                </p>
              </div>
            </div>
          )}
        </header>

        {loading ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">Chat yükleniyor...</p>
          </section>
        ) : error ? (
          <section className="rounded-[2rem] bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-[#e5d9cc] bg-white shadow-sm">
            {!isActive && (
              <div className="border-b border-orange-100 bg-orange-50 p-5">
                <p className="text-lg font-black text-orange-800">
                  🔒 Chat şu anda kilitli
                </p>

                <p className="mt-2 text-sm font-semibold text-orange-700">
                  Danışan ödeme işlemini tamamladıktan sonra platform içi
                  mesajlaşma otomatik aktif olur.
                </p>
              </div>
            )}

            <div className="h-[520px] overflow-y-auto bg-[#faf7f2] p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-3xl bg-white p-6 text-center ring-1 ring-black/5">
                    <p className="text-lg font-black text-[#2b2118]">
                      Henüz mesaj yok
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                      Ödeme tamamlandığında danışanla güvenli şekilde buradan
                      mesajlaşabilirsiniz.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((item) => {
                    const isMine = item.sender_type === 'expert'
                    const isAdmin = item.sender_type === 'admin'

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

                          <p className="mt-3 text-[11px] font-semibold opacity-60">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
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
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={!isActive || sending}
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
                  disabled={!isActive || sending || !message.trim()}
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