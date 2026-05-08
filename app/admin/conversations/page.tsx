'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type SenderType = 'client' | 'expert' | 'admin'

type Conversation = {
  id: string
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
  unreadCount?: number
  last_message?: string | null
  last_message_sender?: SenderType | null
  last_message_sender_name?: string | null
  last_message_at?: string | null
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

function getStatusText(status?: string) {
  if (status === 'active') return 'Aktif'
  if (status === 'locked') return 'Kilitli'
  if (status === 'closed') return 'Kapalı'
  return '-'
}

function getPaymentText(status?: string) {
  if (status === 'paid') return 'Ödendi'
  if (status === 'pending') return 'Bekliyor'
  if (status === 'failed') return 'Başarısız'
  if (status === 'refunded') return 'İade'
  return '-'
}

function getSenderText(sender?: SenderType | null) {
  if (sender === 'client') return 'Danışan'
  if (sender === 'expert') return 'Uzman'
  if (sender === 'admin') return 'Mindora'
  return 'Mesaj yok'
}

function getSenderBadgeClass(sender?: SenderType | null) {
  if (sender === 'client') return 'bg-blue-50 text-blue-700 ring-blue-100'
  if (sender === 'expert') return 'bg-purple-50 text-purple-700 ring-purple-100'
  if (sender === 'admin') return 'bg-zinc-900 text-white ring-zinc-900'
  return 'bg-zinc-100 text-zinc-600 ring-zinc-200'
}

function getPreviewText(message?: string | null) {
  if (!message) return 'Henüz mesaj yok.'

  const clean = message.replace(/\s+/g, ' ').trim()

  if (clean.length <= 120) return clean

  return `${clean.slice(0, 120)}...`
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  async function loadConversations(showLoading = false) {
    try {
      if (showLoading) setLoading(true)
      setRefreshing(true)
      setError('')

      const res = await fetch('/api/admin/conversations', {
        cache: 'no-store',
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Konuşmalar alınamadı.')
        return
      }

      const list: Conversation[] = data.conversations || []

      const withUnread = await Promise.all(
        list.map(async (conversation) => {
          try {
            const unreadRes = await fetch(
              `/api/conversations/${conversation.id}/unread?userType=admin`,
              { cache: 'no-store' }
            )

            const unreadData = await unreadRes.json().catch(() => null)

            return {
              ...conversation,
              unreadCount: unreadData?.unreadCount || 0,
            }
          } catch {
            return {
              ...conversation,
              unreadCount: 0,
            }
          }
        })
      )

      setConversations(withUnread)
    } catch {
      setError('Sunucu bağlantı hatası.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadConversations(true)
  }, [])

  useEffect(() => {
    let isMounted = true

    try {
      const supabase = createMindoraRealtimeClient()

      const channel = supabase
        .channel('admin-conversations-hub')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          async () => {
            if (!isMounted) return
            await loadConversations(false)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
          },
          async () => {
            if (!isMounted) return
            await loadConversations(false)
          }
        )
        .subscribe()

      channelRef.current = channel

      return () => {
        isMounted = false

        if (channelRef.current) {
          supabase.removeChannel(channelRef.current)
        }

        channelRef.current = null
      }
    } catch (err) {
      console.error('ADMIN HUB REALTIME ERROR:', err)
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-[#171717] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <header className="mb-6 mt-6 rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Moderasyon
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
                Konuşmalar
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                Son mesaj preview, unread badge ve canlı moderasyon takibi.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  Realtime aktif
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    refreshing
                      ? 'bg-orange-50 text-orange-700 ring-orange-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {refreshing ? 'Güncelleniyor...' : 'Senkron'}
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  {conversations.length} konuşma
                </span>
              </div>
            </div>

            <button
              onClick={() => loadConversations(false)}
              disabled={loading || refreshing}
              className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? 'Yenileniyor...' : 'Yenile'}
            </button>
          </div>
        </header>

        {loading ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Konuşmalar yükleniyor...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[2rem] bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </section>
        ) : conversations.length === 0 ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-lg font-black text-[#2b2118]">
              Henüz konuşma yok
            </p>

            <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
              Aktif görüşmeler burada listelenecek.
            </p>
          </section>
        ) : (
          <div className="grid gap-4">
            {conversations.map((conversation) => {
              const hasUnread =
                typeof conversation.unreadCount === 'number' &&
                conversation.unreadCount > 0

              return (
                <Link
                  key={conversation.id}
                  href={`/admin/conversations/${conversation.id}`}
                  className={`group rounded-[2rem] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                    hasUnread
                      ? 'border-red-200 ring-2 ring-red-50'
                      : 'border-[#e5d9cc]'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-black px-3 py-1 text-xs font-black text-white">
                          {getStatusText(conversation.status)}
                        </span>

                        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
                          {getPaymentText(conversation.payment_status)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getSenderBadgeClass(
                            conversation.last_message_sender
                          )}`}
                        >
                          Son: {getSenderText(conversation.last_message_sender)}
                        </span>

                        {hasUnread ? (
                          <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white shadow-sm">
                            {conversation.unreadCount} okunmamış
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600 ring-1 ring-zinc-200">
                            Okundu
                          </span>
                        )}
                      </div>

                      <p className="mt-4 break-all text-sm font-black text-[#2b2118]">
                        {conversation.id}
                      </p>

                      <div className="mt-4 rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-black ring-1 ${getSenderBadgeClass(
                              conversation.last_message_sender
                            )}`}
                          >
                            {getSenderText(conversation.last_message_sender)}
                          </span>

                          <span className="text-xs font-bold text-[#8a7662]">
                            {formatDate(
                              conversation.last_message_at ||
                                conversation.updated_at
                            )}
                          </span>
                        </div>

                        <p
                          className={`text-sm font-semibold leading-6 ${
                            conversation.last_message
                              ? 'text-[#2b2118]'
                              : 'text-[#8a7662]'
                          }`}
                        >
                          {getPreviewText(conversation.last_message)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-[#6b5c4d]">
                        <span>
                          Oluşturuldu: {formatDate(conversation.created_at)}
                        </span>

                        <span>
                          Son aktivite:{' '}
                          {formatDate(
                            conversation.last_message_at ||
                              conversation.updated_at
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <div className="rounded-2xl bg-[#faf7f2] px-5 py-3 text-sm font-black text-[#2b2118] ring-1 ring-black/5 transition group-hover:bg-black group-hover:text-white">
                        Konuşmayı Aç →
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}