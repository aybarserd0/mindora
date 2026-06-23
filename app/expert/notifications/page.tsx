'use client'

import Link from 'next/link'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

type UserType = 'client' | 'expert'

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link: string | null
  createdAt: string
}

type NotificationsResponse = {
  ok: boolean
  notifications?: NotificationItem[]
  unreadCount?: number
  error?: string
}

function getDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatDateTime(value?: string | null) {
  const date = getDate(value)
  if (!date) return '-'
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function buildTokenUrl(path: string | null | undefined, token: string) {
  if (!path) return '#'
  if (!token) return path
  try {
    const isAbsolute = /^https?:\/\//i.test(path)
    const url = isAbsolute ? new URL(path) : new URL(path, 'https://mindora.local')
    if (!url.searchParams.get('token')) url.searchParams.set('token', token)
    if (isAbsolute) return url.toString()
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    if (path.includes('token=')) return path
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}token=${encodeURIComponent(token)}`
  }
}

function getNotificationTypeLabel(type?: string | null) {
  const normalized = String(type || '').trim().toLowerCase()
  if (normalized === 'message') return 'Mesaj'
  if (normalized === 'session') return 'Seans'
  if (normalized === 'payment') return 'Ödeme'
  if (normalized === 'review') return 'Değerlendirme'
  if (normalized === 'admin') return 'Mindora'
  if (normalized === 'system') return 'Sistem'
  return 'Bildirim'
}

function getPreview(value?: string | null, maxLength = 180) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim()
  if (!clean) return 'İçerik bulunmuyor.'
  if (clean.length <= maxLength) return clean
  return `${clean.slice(0, maxLength)}...`
}

function isPlaceholderToken(token: string) {
  const normalized = token.trim().toLowerCase()
  return normalized === 'token' || normalized === 'gercek_token' || normalized === 'gerçek_token'
}


function NotificationsContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const conversationId = searchParams.get('conversationId') || ''
  const userId = searchParams.get('userId') || ''

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const dashboardHref = useMemo(() => buildTokenUrl('/expert/dashboard', token), [token])

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('role', 'expert')
    params.set('limit', '50')
    if (token) params.set('token', token)
    if (conversationId) params.set('conversationId', conversationId)
    if (userId) params.set('userId', userId)
    return `/api/notifications?${params.toString()}`
  }, [conversationId, token, userId])

  const readUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('role', 'expert')
    if (token) params.set('token', token)
    if (conversationId) params.set('conversationId', conversationId)
    if (userId) params.set('userId', userId)
    return `/api/notifications/read?${params.toString()}`
  }, [conversationId, token, userId])

  const readAllUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.set('role', 'expert')
    if (token) params.set('token', token)
    if (conversationId) params.set('conversationId', conversationId)
    if (userId) params.set('userId', userId)
    return `/api/notifications/read-all?${params.toString()}`
  }, [conversationId, token, userId])

  const loadNotifications = useCallback(
    async (mode: 'initial' | 'refresh' = 'refresh') => {
      if (!token || isPlaceholderToken(token)) {
        setNotifications([])
        setUnreadCount(0)
        setError('Bildirimleri görmek için güvenli erişim bağlantısı gerekir.')
        setLoading(false)
        setRefreshing(false)
        return
      }

      try {
        if (mode === 'initial') setLoading(true)
        else setRefreshing(true)

        setError('')

        const res = await fetch(apiUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })

        const data = (await res.json().catch(() => null)) as NotificationsResponse | null

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Bildirimler alınamadı.')
        }

        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } catch (err) {
        setNotifications([])
        setUnreadCount(0)
        setError(err instanceof Error ? err.message : 'Bildirimler alınamadı.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [apiUrl, token]
  )

  async function markAsRead(notificationId: string) {
    try {
      const res = await fetch(readUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ notificationId }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Bildirim güncellenemedi.')

      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, isRead: true } : item))
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    } catch {
      await loadNotifications('refresh')
    }
  }

  async function markAllAsRead() {
    try {
      setRefreshing(true)
      const res = await fetch(readAllUrl, { method: 'POST', cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Bildirimler güncellenemedi.')
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })))
      setUnreadCount(0)
    } catch {
      await loadNotifications('refresh')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadNotifications('initial')
  }, [loadNotifications])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Mindora Notification Center
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Uzman Bildirimleri
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Mesaj, seans, ödeme, değerlendirme ve sistem bildirimlerini tek yerden takip edin.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">
                  {unreadCount} okunmamış
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  Güvenli erişim
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void loadNotifications('refresh')}
                disabled={refreshing}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {refreshing ? 'Yükleniyor...' : 'Yenile'}
              </button>
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                disabled={refreshing || unreadCount === 0}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Tümünü Okundu Yap
              </button>
              <Link
                href={dashboardHref}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
              >
                Panele Dön
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="font-black text-slate-600">Bildirimler yükleniyor...</p>
          </section>
        ) : error ? (
          <section className="rounded-[2rem] border border-red-100 bg-red-50 p-8 text-center shadow-sm">
            <p className="text-lg font-black text-red-700">Bildirimler alınamadı</p>
            <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
          </section>
        ) : notifications.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black text-slate-950">Henüz bildirim yok</p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Yeni mesaj, seans veya sistem güncellemesi olduğunda burada görünecek.
            </p>
          </section>
        ) : (
          <section className="space-y-3">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                token={token}
                onMarkRead={markAsRead}
              />
            ))}
          </section>
        )}
      </section>
    </main>
  )
}

function NotificationCard({
  notification,
  token,
  onMarkRead,
}: {
  notification: NotificationItem
  token: string
  onMarkRead: (id: string) => void
}) {
  const href = notification.link ? buildTokenUrl(notification.link, token) : ''

  return (
    <article
      className={`rounded-[1.5rem] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        notification.isRead ? 'border-slate-200 bg-white' : 'border-indigo-100 bg-indigo-50'
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                notification.isRead
                  ? 'bg-slate-50 text-slate-600 ring-slate-200'
                  : 'bg-white text-indigo-700 ring-indigo-100'
              }`}
            >
              {getNotificationTypeLabel(notification.type)}
            </span>
            {!notification.isRead ? (
              <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-black text-white">
                Yeni
              </span>
            ) : null}
            <span className="text-xs font-bold text-slate-500">
              {formatDateTime(notification.createdAt)}
            </span>
          </div>

          <h2 className="mt-3 text-lg font-black text-slate-950">{notification.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {getPreview(notification.message, 260)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-40">
          {href ? (
            <Link
              href={href}
              onClick={() => !notification.isRead && onMarkRead(notification.id)}
              className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
            >
              Aç
            </Link>
          ) : null}

          {!notification.isRead ? (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Okundu Yap
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-5xl rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <p className="font-black text-slate-600">Bildirimler yükleniyor...</p>
          </section>
        </main>
      }
    >
      <NotificationsContent />
    </Suspense>
  )
}
