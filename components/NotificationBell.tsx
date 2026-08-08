'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '@/components/ToastProvider'

type Role = 'client' | 'expert' | 'admin'

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

type Props = {
  role: Role
  token?: string
  userId?: string
  conversationId?: string
  adminSecret?: string
  refreshIntervalMs?: number
}

function buildNotificationUrl(path: string, params: URLSearchParams) {
  const query = params.toString()
  return query ? `${path}?${query}` : path
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function notificationIcon(type: string) {
  switch (type) {
    case 'message':
      return '✉'
    case 'session':
      return '▶'
    case 'payment':
      return '₺'
    case 'review':
      return '★'
    case 'admin':
      return '!'
    default:
      return '•'
  }
}

function toastTypeForNotification(type: string) {
  if (type === 'payment' || type === 'review') return 'success' as const
  if (type === 'admin') return 'warning' as const
  return 'info' as const
}

export default function NotificationBell({
  role,
  token = '',
  userId = '',
  conversationId = '',
  adminSecret = '',
  refreshIntervalMs = 15000,
}: Props) {
  const { showToast } = useToast()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const ref = useRef<HTMLDivElement>(null)
  const knownIdsRef = useRef<Set<string>>(new Set())
  const hasLoadedOnceRef = useRef(false)
  const isLoadingRef = useRef(false)

  const authParams = useMemo(() => {
    const params = new URLSearchParams({ role })

    if (token) params.set('token', token)
    if (userId) params.set('userId', userId)
    if (conversationId) params.set('conversationId', conversationId)
    if (adminSecret) params.set('adminSecret', adminSecret)

    return params
  }, [adminSecret, conversationId, role, token, userId])

  const notificationsPageHref = useMemo(() => {
    const path = role === 'admin' ? '/admin/notifications' : `/${role}/notifications`
    const query = authParams.toString()
    return query ? `${path}?${query}` : path
  }, [authParams, role])

  const loadNotifications = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (isLoadingRef.current) return

      isLoadingRef.current = true

      if (!silent) {
        setLoading(true)
      }

      setErrorMessage('')

      try {
        const params = new URLSearchParams(authParams)
        params.set('limit', '10')

        const res = await fetch(buildNotificationUrl('/api/notifications', params), {
          method: 'GET',
          cache: 'no-store',
        })

        const data = await res.json().catch(() => null)

        if (!res.ok || !data?.ok) {
          setErrorMessage(data?.error || 'Bildirimler alınamadı.')
          return
        }

        const nextNotifications: NotificationItem[] = Array.isArray(data.notifications)
          ? data.notifications
          : []

        const nextUnreadCount = Number.isFinite(Number(data.unreadCount))
          ? Number(data.unreadCount)
          : 0

        if (hasLoadedOnceRef.current) {
          const newUnreadNotifications = nextNotifications
            .filter((item) => !knownIdsRef.current.has(item.id) && !item.isRead)
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )

          newUnreadNotifications.slice(0, 3).forEach((item) => {
            showToast(item.title, item.message, toastTypeForNotification(item.type), {
              browserNotification: true,
              notificationTitle: item.title,
              notificationBody: item.message,
              durationMs: 5500,
            })
          })
        }

        knownIdsRef.current = new Set(nextNotifications.map((item) => item.id))
        hasLoadedOnceRef.current = true

        setNotifications(nextNotifications)
        setUnreadCount(nextUnreadCount)
      } catch {
        if (!silent) {
          setErrorMessage('Bildirimler alınamadı.')
        }
      } finally {
        isLoadingRef.current = false
        if (!silent) {
          setLoading(false)
        }
      }
    },
    [authParams, showToast]
  )

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useEffect(() => {
    if (refreshIntervalMs <= 0) return

    const interval = window.setInterval(() => {
      void loadNotifications({ silent: true })
    }, refreshIntervalMs)

    return () => window.clearInterval(interval)
  }, [loadNotifications, refreshIntervalMs])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadNotifications({ silent: true })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [loadNotifications])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function markAllRead() {
    if (markingAllRead || unreadCount <= 0) return

    setMarkingAllRead(true)
    setErrorMessage('')

    try {
      const res = await fetch(buildNotificationUrl('/api/notifications/read-all', authParams), {
        method: 'POST',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setErrorMessage(data?.error || 'Bildirimler okundu yapılamadı.')
        return
      }

      setUnreadCount(0)
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          isRead: true,
        }))
      )
    } catch {
      setErrorMessage('Bildirimler okundu yapılamadı.')
    } finally {
      setMarkingAllRead(false)
    }
  }

  return (
    <div ref={ref} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        aria-label="Bildirimler"
        aria-expanded={open}
      >
        <span aria-hidden="true">🔔</span>

        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[10px] font-black leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-950">Bildirimler</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Okunmamış bildirim yok'}
                </p>
              </div>

              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAllRead || unreadCount <= 0}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAllRead ? 'İşleniyor...' : 'Tümünü okundu yap'}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="max-h-[22rem] overflow-y-auto p-2">
            {loading ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
                Bildirimler yükleniyor...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
                Henüz bildirim bulunmuyor.
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.slice(0, 5).map((notification) => {
                  const content = (
                    <div
                      className={`rounded-2xl border px-3 py-3 transition hover:bg-slate-50 ${
                        notification.isRead
                          ? 'border-slate-100 bg-white'
                          : 'border-indigo-100 bg-indigo-50/60'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                            notification.isRead
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {notificationIcon(notification.type)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-black text-slate-950">
                              {notification.title}
                            </p>
                            {!notification.isRead ? (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                            ) : null}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-[11px] font-bold text-slate-400">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )

                  if (!notification.link) {
                    return <div key={notification.id}>{content}</div>
                  }

                  return (
                    <Link
                      key={notification.id}
                      href={notification.link}
                      onClick={() => setOpen(false)}
                      className="block no-underline"
                    >
                      {content}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <Link
              href={notificationsPageHref}
              onClick={() => setOpen(false)}
              className="block rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white no-underline transition hover:bg-slate-800"
            >
              Tüm bildirimleri gör
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
