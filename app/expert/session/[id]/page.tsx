'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react'

import '@livekit/components-styles'

type SessionResponse = {
  ok: boolean
  token?: string
  url?: string
  roomName?: string
  identity?: string
  error?: string
}

export default function ExpertSessionPage() {
  const params = useParams()
  const searchParams = useSearchParams()

  const sessionId = useMemo(() => {
    return String(params?.id || '')
  }, [params])

  const accessToken = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [serverUrl, setServerUrl] = useState('')

  useEffect(() => {
    if (!sessionId || !accessToken) {
      setError('Missing session token.')
      setLoading(false)
      return
    }

    let cancelled = false

    async function initializeSession() {
      try {
        setLoading(true)
        setError('')

        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            participantName: 'expert-user',
            userType: 'expert',
            token: accessToken,
          }),
        })

        const data: SessionResponse = await res.json()

        if (!res.ok || !data.ok || !data.token || !data.url) {
          throw new Error(data.error || 'Could not initialize session.')
        }

        if (cancelled) return

        setToken(data.token)
        setServerUrl(data.url)
      } catch (err) {
        console.error(err)

        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Unexpected session initialization error.'
        )
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    initializeSession()

    return () => {
      cancelled = true
    }
  }, [sessionId, accessToken])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="mb-3 text-2xl font-semibold">
            Session hazırlanıyor...
          </h1>

          <p className="text-sm text-zinc-400">
            Güvenli bağlantı kuruluyor.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-zinc-900 p-6">
          <h1 className="mb-3 text-2xl font-semibold text-red-400">
            Session başlatılamadı
          </h1>

          <p className="text-sm text-zinc-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-black">
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        video
        audio
        data-lk-theme="default"
        onDisconnected={() => {
          console.log('Disconnected from room.')
        }}
      >
        <VideoConference />

        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}