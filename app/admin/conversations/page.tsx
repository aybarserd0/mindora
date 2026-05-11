'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type SenderType = 'client' | 'expert' | 'admin'
type UserPresenceType = 'client' | 'expert' | 'admin'
type FilterType = 'all' | 'unread' | 'active' | 'locked' | 'paid' | 'online'

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

  client_access_token?: string | null
  expert_access_token?: string | null
  clientAccessToken?: string | null
  expertAccessToken?: string | null
  client_token?: string | null
  expert_token?: string | null
}

type PresenceState = {
  client: boolean
  expert: boolean
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

function getTimeValue(date?: string | null) {
  if (!date) return 0
  const value = new Date(date).getTime()
  return Number.isNaN(value) ? 0 : value
}

function getStatusText(status?: string) {
  if (status === 'active') return 'Aktif'
  if (status === 'locked') return 'Kilitli'
  if (status === 'closed') return 'Kapalı'
  return '-'
}

function getStatusClass(status?: string) {
  if (status === 'active') return 'bg-emerald-600 text-white'
  if (status === 'locked') return 'bg-zinc-900 text-white'
  if (status === 'closed') return 'bg-zinc-200 text-zinc-700'
  return 'bg-zinc-100 text-zinc-600'
}

function getPaymentText(status?: string) {
  if (status === 'paid') return 'Ödendi'
  if (status === 'pending') return 'Bekliyor'
  if (status === 'failed') return 'Başarısız'
  if (status === 'refunded') return 'İade'
  return '-'
}

function getPaymentClass(status?: string) {
  if (status === 'paid') return 'bg-green-50 text-green-700 ring-green-100'
  if (status === 'pending') return 'bg-orange-50 text-orange-700 ring-orange-100'
  if (status === 'failed') return 'bg-red-50 text-red-700 ring-red-100'
  if (status === 'refunded') return 'bg-blue-50 text-blue-700 ring-blue-100'
  return 'bg-zinc-100 text-zinc-600 ring-zinc-200'
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

function getClientToken(conversation: Conversation) {
  return (
    conversation.client_access_token ||
    conversation.clientAccessToken ||
    conversation.client_token ||
    ''
  )
}

function getExpertToken(conversation: Conversation) {
  return (
    conversation.expert_access_token ||
    conversation.expertAccessToken ||
    conversation.expert_token ||
    ''
  )
}

function buildChatUrl(
  userType: 'client' | 'expert',
  conversationId: string,
  token: string
) {
  const basePath =
    userType === 'client'
      ? `/client/chat/${conversationId}`
      : `/expert/chat/${conversationId}`

  if (!token) return basePath

  return `${basePath}?token=${encodeURIComponent(token)}`
}

function parsePresenceState(rawState: Record<string, unknown[]>): PresenceState {
  const next: PresenceState = {
    client: false,
    expert: false,
  }

  Object.values(rawState).forEach((items) => {
    items.forEach((item) => {
      const presence = item as {
        userType?: UserPresenceType
        user_type?: UserPresenceType
        role?: UserPresenceType
      }

      const userType = presence.userType || presence.user_type || presence.role

      if (userType === 'client') next.client = true
      if (userType === 'expert') next.expert = true
    })
  })

  return next
}

function PresencePill({
  label,
  online,
}: {
  label: string
  online: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${
        online
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
          : 'bg-zinc-100 text-zinc-500 ring-zinc-200'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          online ? 'bg-emerald-500' : 'bg-zinc-400'
        }`}
      />
      {label} {online ? 'online' : 'offline'}
    </span>
  )
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceState>>(
    {}
  )
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const isMountedRef = useRef(true)
  const conversationsRef = useRef<Conversation[]>([])
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hubChannelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  const presenceChannelsRef = useRef<
    Record<
      string,
      ReturnType<ReturnType<typeof createMindoraRealtimeClient>['channel']>
    >
  >({})

  const supabaseRef = useRef<ReturnType<
    typeof createMindoraRealtimeClient
  > | null>(null)

  const totalUnread = useMemo(() => {
    return conversations.reduce((total, conversation) => {
      return total + (conversation.unreadCount || 0)
    }, 0)
  }, [conversations])

  const activeCount = useMemo(() => {
    return conversations.filter((item) => item.status === 'active').length
  }, [conversations])

  const paidCount = useMemo(() => {
    return conversations.filter((item) => item.payment_status === 'paid').length
  }, [conversations])

  const secureLinkReadyCount = useMemo(() => {
    return conversations.filter((item) => {
      return Boolean(getClientToken(item) && getExpertToken(item))
    }).length
  }, [conversations])

  const onlineSummary = useMemo(() => {
    return conversations.reduce(
      (total, conversation) => {
        const state = presenceMap[conversation.id]

        if (state?.client) total.clients += 1
        if (state?.expert) total.experts += 1

        return total
      },
      { clients: 0, experts: 0 }
    )
  }, [conversations, presenceMap])

  const filteredConversations = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return conversations
      .filter((conversation) => {
        const presence = presenceMap[conversation.id]
        const hasUnread = (conversation.unreadCount || 0) > 0

        if (filter === 'unread' && !hasUnread) return false
        if (filter === 'active' && conversation.status !== 'active') return false
        if (filter === 'locked' && conversation.status !== 'locked') return false
        if (filter === 'paid' && conversation.payment_status !== 'paid') return false
        if (filter === 'online' && !presence?.client && !presence?.expert) {
          return false
        }

        if (!searchText) return true

        const haystack = [
          conversation.id,
          conversation.last_message,
          conversation.last_message_sender,
          conversation.last_message_sender_name,
          conversation.status,
          conversation.payment_status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(searchText)
      })
      .sort((a, b) => {
        const unreadDiff = (b.unreadCount || 0) - (a.unreadCount || 0)
        if (unreadDiff !== 0) return unreadDiff

        const bTime = getTimeValue(b.last_message_at || b.updated_at)
        const aTime = getTimeValue(a.last_message_at || a.updated_at)

        return bTime - aTime
      })
  }, [conversations, filter, presenceMap, search])

  const cleanupPresenceChannels = useCallback((idsToKeep: string[] = []) => {
    const supabase = supabaseRef.current
    if (!supabase) return

    const keepSet = new Set(idsToKeep)

    Object.entries(presenceChannelsRef.current).forEach(
      ([conversationId, channel]) => {
        if (keepSet.has(conversationId)) return

        try {
          channel.untrack()
          supabase.removeChannel(channel)
        } catch (err) {
          console.error('ADMIN HUB PRESENCE CLEANUP ERROR:', err)
        }

        delete presenceChannelsRef.current[conversationId]
      }
    )

    setPresenceMap((current) => {
      const next = { ...current }

      Object.keys(next).forEach((conversationId) => {
        if (!keepSet.has(conversationId)) {
          delete next[conversationId]
        }
      })

      return next
    })
  }, [])

  const setupPresenceChannels = useCallback(
    (list: Conversation[]) => {
      const supabase = supabaseRef.current
      if (!supabase) return

      const conversationIds = list.map((conversation) => conversation.id)

      cleanupPresenceChannels(conversationIds)

      conversationIds.forEach((conversationId) => {
        if (presenceChannelsRef.current[conversationId]) return

        const channelName = `mindora-conversation-${conversationId}`

        const channel = supabase.channel(channelName, {
          config: {
            presence: {
              key: `admin-hub-${conversationId}`,
            },
          },
        })

        channel
          .on('presence', { event: 'sync' }, () => {
            if (!isMountedRef.current) return

            const rawState = channel.presenceState()
            const nextState = parsePresenceState(rawState)

            setPresenceMap((current) => ({
              ...current,
              [conversationId]: nextState,
            }))
          })
          .subscribe(async (status) => {
            if (status !== 'SUBSCRIBED') return

            try {
              await channel.track({
                userType: 'admin',
                user_type: 'admin',
                role: 'admin',
                page: 'admin_conversations_hub',
                conversationId,
                conversation_id: conversationId,
                onlineAt: new Date().toISOString(),
                online_at: new Date().toISOString(),
              })
            } catch (err) {
              console.error('ADMIN HUB PRESENCE TRACK ERROR:', err)
            }
          })

        presenceChannelsRef.current[conversationId] = channel
      })
    },
    [cleanupPresenceChannels]
  )

  const loadConversations = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true)

        setRefreshing(true)
        setError('')

        const res = await fetch('/api/admin/conversations', {
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)

        if (!res.ok || !data?.ok) {
          setError(data?.error || 'Konuşmalar alınamadı.')
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
                unreadCount: Number(unreadData?.unreadCount || 0),
              }
            } catch {
              return {
                ...conversation,
                unreadCount: 0,
              }
            }
          })
        )

        if (!isMountedRef.current) return

        conversationsRef.current = withUnread
        setConversations(withUnread)
        setupPresenceChannels(withUnread)
      } catch {
        if (isMountedRef.current) {
          setError('Sunucu bağlantı hatası.')
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [setupPresenceChannels]
  )

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return
      loadConversations(false)
    }, 350)
  }, [loadConversations])

  useEffect(() => {
    isMountedRef.current = true
    supabaseRef.current = createMindoraRealtimeClient()

    loadConversations(true)

    return () => {
      isMountedRef.current = false
    }
  }, [loadConversations])

  useEffect(() => {
    const supabase = supabaseRef.current
    if (!supabase) return

    try {
      const channel = supabase
        .channel('admin-conversations-hub')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
          },
          () => {
            if (!isMountedRef.current) return
            scheduleRefresh()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
          },
          () => {
            if (!isMountedRef.current) return
            scheduleRefresh()
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversation_reads',
          },
          () => {
            if (!isMountedRef.current) return
            scheduleRefresh()
          }
        )
        .subscribe()

      hubChannelRef.current = channel

      return () => {
        if (hubChannelRef.current) {
          supabase.removeChannel(hubChannelRef.current)
        }

        hubChannelRef.current = null
      }
    } catch (err) {
      console.error('ADMIN HUB REALTIME ERROR:', err)
    }
  }, [scheduleRefresh])

  useEffect(() => {
    return () => {
      const supabase = supabaseRef.current

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      if (supabase && hubChannelRef.current) {
        try {
          supabase.removeChannel(hubChannelRef.current)
        } catch {}
      }

      if (supabase) {
        Object.values(presenceChannelsRef.current).forEach((channel) => {
          try {
            channel.untrack()
            supabase.removeChannel(channel)
          } catch {}
        })
      }

      hubChannelRef.current = null
      presenceChannelsRef.current = {}
      supabaseRef.current = null
    }
  }, [])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-[#171717] md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <AdminHeader />

        <header className="mb-6 mt-6 rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Moderasyon
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
                Konuşmalar
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                Son mesaj, okunmamış mesaj, ödeme durumu, filtreleme, online
                kullanıcı takibi ve secure test linkleri.
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

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  {activeCount} aktif
                </span>

                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-100">
                  {paidCount} ödenmiş
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                  {secureLinkReadyCount} secure link hazır
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    totalUnread > 0
                      ? 'bg-red-50 text-red-700 ring-red-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {totalUnread > 0
                    ? `${totalUnread} toplam okunmamış`
                    : 'Tüm mesajlar okundu'}
                </span>

                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  {onlineSummary.clients} danışan online
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  {onlineSummary.experts} uzman online
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

          <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Konuşma ID, mesaj, durum veya gönderen ara..."
              className="rounded-2xl border border-black/10 bg-[#faf7f2] px-4 py-3 text-sm font-bold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30"
            />

            <div className="flex flex-wrap gap-2">
              {[
                ['all', 'Tümü'],
                ['unread', 'Okunmamış'],
                ['active', 'Aktif'],
                ['locked', 'Kilitli'],
                ['paid', 'Ödenmiş'],
                ['online', 'Online'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value as FilterType)}
                  className={`rounded-full px-4 py-2 text-xs font-black ring-1 transition ${
                    filter === value
                      ? 'bg-black text-white ring-black'
                      : 'bg-white text-[#6b5c4d] ring-black/10 hover:bg-[#f0e8df]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
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
        ) : filteredConversations.length === 0 ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="text-lg font-black text-[#2b2118]">
              Sonuç bulunamadı
            </p>

            <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
              Filtreyi veya arama kelimesini değiştirerek tekrar deneyin.
            </p>
          </section>
        ) : (
          <div className="grid gap-4">
            {filteredConversations.map((conversation) => {
              const hasUnread =
                typeof conversation.unreadCount === 'number' &&
                conversation.unreadCount > 0

              const presence = presenceMap[conversation.id] || {
                client: false,
                expert: false,
              }

              const clientToken = getClientToken(conversation)
              const expertToken = getExpertToken(conversation)
              const clientUrl = buildChatUrl(
                'client',
                conversation.id,
                clientToken
              )
              const expertUrl = buildChatUrl(
                'expert',
                conversation.id,
                expertToken
              )

              const hasClientLink = Boolean(clientToken)
              const hasExpertLink = Boolean(expertToken)

              return (
                <article
                  key={conversation.id}
                  className={`rounded-[2rem] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                    hasUnread
                      ? 'border-red-200 ring-2 ring-red-50'
                      : 'border-[#e5d9cc]'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                            conversation.status
                          )}`}
                        >
                          {getStatusText(conversation.status)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getPaymentClass(
                            conversation.payment_status
                          )}`}
                        >
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

                        <PresencePill
                          label="Danışan"
                          online={presence.client}
                        />

                        <PresencePill label="Uzman" online={presence.expert} />

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                            hasClientLink && hasExpertLink
                              ? 'bg-blue-50 text-blue-700 ring-blue-100'
                              : 'bg-orange-50 text-orange-700 ring-orange-100'
                          }`}
                        >
                          {hasClientLink && hasExpertLink
                            ? 'Secure link hazır'
                            : 'Secure link eksik'}
                        </span>
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

                    <div className="flex w-full flex-col gap-2 lg:w-56">
                      <Link
                        href={`/admin/conversations/${conversation.id}`}
                        className="rounded-2xl bg-[#faf7f2] px-5 py-3 text-center text-sm font-black text-[#2b2118] ring-1 ring-black/5 transition hover:bg-black hover:text-white"
                      >
                        Konuşmayı Aç →
                      </Link>

                      <a
                        href={hasClientLink ? clientUrl : undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!hasClientLink}
                        onClick={(event) => {
                          if (!hasClientLink) event.preventDefault()
                        }}
                        className={`rounded-2xl px-5 py-3 text-center text-xs font-black transition ${
                          hasClientLink
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'cursor-not-allowed bg-blue-100 text-blue-400'
                        }`}
                      >
                        Client Secure Test
                      </a>

                      <a
                        href={hasExpertLink ? expertUrl : undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!hasExpertLink}
                        onClick={(event) => {
                          if (!hasExpertLink) event.preventDefault()
                        }}
                        className={`rounded-2xl px-5 py-3 text-center text-xs font-black transition ${
                          hasExpertLink
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'cursor-not-allowed bg-purple-100 text-purple-400'
                        }`}
                      >
                        Expert Secure Test
                      </a>

                      {(!hasClientLink || !hasExpertLink) && (
                        <p className="rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold leading-5 text-orange-700 ring-1 ring-orange-100">
                          API token alanlarını döndürmüyor olabilir.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}