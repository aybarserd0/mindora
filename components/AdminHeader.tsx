'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type Conversation = {
  id: string
}

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const [totalUnread, setTotalUnread] = useState(0)
  const [loadingUnread, setLoadingUnread] = useState(false)

  const isMountedRef = useRef(true)
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  const loadTotalUnread = useCallback(async () => {
    try {
      setLoadingUnread(true)

      const res = await fetch('/api/admin/conversations', {
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        if (isMountedRef.current) setTotalUnread(0)
        return
      }

      const conversations: Conversation[] = data.conversations || []

      const unreadCounts = await Promise.all(
        conversations.map(async (conversation) => {
          try {
            const unreadRes = await fetch(
              `/api/conversations/${conversation.id}/unread?userType=admin`,
              { cache: 'no-store' }
            )

            const unreadData = await unreadRes.json().catch(() => null)
            return Number(unreadData?.unreadCount || 0)
          } catch {
            return 0
          }
        })
      )

      const total = unreadCounts.reduce((sum, count) => sum + count, 0)

      if (isMountedRef.current) {
        setTotalUnread(total)
      }
    } catch {
      if (isMountedRef.current) {
        setTotalUnread(0)
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingUnread(false)
      }
    }
  }, [])

  async function logout() {
    await fetch('/api/admin/logout', {
      method: 'POST',
    })

    router.push('/admin/login')
  }

  useEffect(() => {
    isMountedRef.current = true
    loadTotalUnread()

    return () => {
      isMountedRef.current = false
    }
  }, [loadTotalUnread])

  useEffect(() => {
    const supabase = createMindoraRealtimeClient()

    const channel = supabase
      .channel('admin-header-unread-sync')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async () => {
          await loadTotalUnread()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_reads',
        },
        async () => {
          await loadTotalUnread()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_reads',
        },
        async () => {
          await loadTotalUnread()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      channelRef.current = null
    }
  }, [loadTotalUnread])

  const navItems = [
    {
      href: '/admin/uzman-basvurulari',
      label: 'Uzman Başvuruları',
    },
    {
      href: '/admin/danisan-basvurulari',
      label: 'Danışan Başvuruları',
    },
    {
      href: '/admin/payments',
      label: 'Ödemeler',
    },
    {
      href: '/admin/conversations',
      label: 'Konuşmalar',
      badge: totalUnread,
    },
  ]

  return (
    <div className="mb-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 text-sm font-black tracking-[0.45em] text-[#8a6a4f]">
            MINDORA ADMIN
          </div>

          <h1 className="m-0 text-4xl font-black text-[#171717]">
            Admin Panel
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#6b5c4d] ring-1 ring-[#e5d9cc]">
              Operasyon Merkezi
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                totalUnread > 0
                  ? 'bg-red-50 text-red-700 ring-red-100'
                  : 'bg-emerald-50 text-emerald-700 ring-emerald-100'
              }`}
            >
              {loadingUnread
                ? 'Mesajlar senkronlanıyor...'
                : totalUnread > 0
                  ? `${totalUnread} okunmamış mesaj`
                  : 'Tüm mesajlar okundu'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full border border-[#ddd] bg-white px-6 py-3 text-sm font-black text-[#111] no-underline transition hover:-translate-y-0.5 hover:shadow-md"
          >
            Siteye Dön
          </Link>

          <button
            onClick={logout}
            className="rounded-full border-none bg-black px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#2b2118] hover:shadow-md"
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      <nav className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`)

          const hasBadge =
            typeof item.badge === 'number' && item.badge > 0

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center justify-center rounded-2xl border px-5 py-4 text-center text-sm font-black no-underline transition hover:-translate-y-0.5 hover:shadow-md ${
                isActive
                  ? 'border-black bg-black text-white'
                  : 'border-[#ddd] bg-white text-[#111]'
              }`}
            >
              <span>{item.label}</span>

              {hasBadge && (
                <span className="absolute -right-2 -top-2 min-w-7 rounded-full bg-red-500 px-2 py-1 text-xs font-black text-white shadow-md ring-2 ring-white">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}