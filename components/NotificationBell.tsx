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
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-current/10 transition-colors hover:bg-current/15"
        aria-label="Bildirimler"
        aria-expanded={open}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white ring-2 ring-current/0">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-fade-in-up absolute right-0 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg">
          <div className="border-b border-slate-200/80 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Bildirimler</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Okunmamış bildirim yok'}
                </p>
              </div>

              <button
                type="button"
                onClick={markAllRead}
                disabled={markingAllRead || unreadCount <= 0}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAllRead ? 'İşleniyor...' : 'Tümünü okundu yap'}
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="max-h-[22rem] overflow-y-auto p-2">
            {loading ? (
              <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                Bildirimler yükleniyor...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-lg bg-slate-50 px-4 py-5 text-sm font-medium text-slate-500">
                Henüz bildirim bulunmuyor.
              </div>
            ) : (
              <div className="space-y-1.5">
                {notifications.slice(0, 5).map((notification) => {
                  const content = (
                    <div
                      className={`rounded-lg border px-3 py-3 transition-all duration-200 ease-out hover:border-slate-300 ${
                        notification.isRead
                          ? 'border-slate-200/80 bg-white'
                          : 'border-indigo-100 bg-indigo-50/60'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                            notification.isRead
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-indigo-600 text-white'
                          }`}
                        >
                          {notificationIcon(notification.type)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                              {notification.title}
                            </p>
                            {!notification.isRead ? (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                            ) : null}
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                            {notification.message}
                          </p>

                          <p className="mt-2 text-[11px] font-medium text-slate-400">
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

          <div className="border-t border-slate-200/80 bg-slate-50 px-4 py-3">
            <Link
              href={notificationsPageHref}
              onClick={() => setOpen(false)}
              className="block rounded-full bg-pine-800 px-4 py-3 text-center text-sm font-semibold text-white no-underline transition-all duration-200 ease-out hover:bg-pine-900"
            >
              Tüm bildirimleri gör
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
