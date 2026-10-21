'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LiveKitRoom, VideoConference } from '@livekit/components-react'
import '@livekit/components-styles'
import { Notice, secondaryButton } from '@/components/supervision/ui'

type RoomResponse = { ok?: boolean; error?: string; token?: string; serverUrl?: string; role?: 'supervisor' | 'supervisee' }

export default function SupervisionRoomPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [room, setRoom] = useState<RoomResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/supervision/bookings/${params.id}/room`, { method: 'POST', cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as RoomResponse
      if (!cancelled) setRoom(res.ok ? data : { error: data.error || 'Odaya bağlanılamadı.' })
    })()
    return () => {
      cancelled = true
    }
  }, [params.id])

  const backHref = room?.role === 'supervisor' ? '/expert/dashboard/supervizor' : '/expert/dashboard/supervizyon'

  if (!room) {
    return <div className="p-8 text-sm text-slate-500">Görüşme odası hazırlanıyor…</div>
  }

  if (!room.token || !room.serverUrl) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-8">
        <Notice tone="bad">{room.error}</Notice>
        <Link href={backHref} className={secondaryButton}>
          Geri dön
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col bg-slate-950">
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-slate-300">
        <p>Süpervizyon görüşmesi kaydedilmez. Danışan bilgisi paylaşırken vaka kartındaki sınırlara dikkat et.</p>
      </div>
      <LiveKitRoom
        token={room.token}
        serverUrl={room.serverUrl}
        connect
        video
        audio
        data-lk-theme="default"
        className="min-h-0 flex-1"
        onDisconnected={() => router.push(backHref)}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  )
}
