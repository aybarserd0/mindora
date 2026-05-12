'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  VideoConference,
} from '@livekit/components-react'

import '@livekit/components-styles/prefabs'

type SessionResponse = {
  ok: boolean
  token?: string
  url?: string
  roomName?: string
  identity?: string
  error?: string
}

type PermissionState = 'idle' | 'checking' | 'granted' | 'denied' | 'unsupported'
type RecoveryState = 'idle' | 'reconnecting' | 'lost'
type ParticipantState = 'waiting' | 'active' | 'remote-left'
type SessionExitReason = 'left' | 'connection_lost'

type DeviceState = {
  audioInputId: string
  videoInputId: string
  audioEnabled: boolean
  videoEnabled: boolean
}

const DEFAULT_DEVICE_STATE: DeviceState = {
  audioInputId: '',
  videoInputId: '',
  audioEnabled: true,
  videoEnabled: true,
}

const MAX_RETRY_COUNT = 3
const AUTO_RETRY_DELAY_MS = 2500
const CONNECTION_FAILSAFE_MS = 15000

export default function ClientSessionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()

  const sessionId = useMemo(() => String(params?.id || ''), [params])
  const accessToken = searchParams.get('token') || ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const [serverUrl, setServerUrl] = useState('')

  const [permissionState, setPermissionState] = useState<PermissionState>('idle')
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([])
  const [deviceState, setDeviceState] = useState<DeviceState>(DEFAULT_DEVICE_STATE)

  const [previewReady, setPreviewReady] = useState(false)
  const [joining, setJoining] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('Hazırlanıyor')
  const [sessionStarted, setSessionStarted] = useState(false)
  const [sessionExited, setSessionExited] = useState(false)
  const [exitReason, setExitReason] = useState<SessionExitReason>('left')

  const [isBrowserOnline, setIsBrowserOnline] = useState(true)
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('idle')
  const [retryCount, setRetryCount] = useState(0)
  const [roomConnectKey, setRoomConnectKey] = useState(0)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [remoteParticipantCount, setRemoteParticipantCount] = useState(0)
  const [participantState, setParticipantState] = useState<ParticipantState>('waiting')
  const [remoteParticipantSeen, setRemoteParticipantSeen] = useState(false)
  const [liveAudioEnabled, setLiveAudioEnabled] = useState(true)
  const [liveVideoEnabled, setLiveVideoEnabled] = useState(true)

  const previewVideoRef = useRef<HTMLVideoElement | null>(null)
  const previewStreamRef = useRef<MediaStream | null>(null)
  const autoRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failsafeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionStartedAtRef = useRef<number | null>(null)

  const clearRecoveryTimers = useCallback(() => {
    if (autoRetryTimeoutRef.current) {
      clearTimeout(autoRetryTimeoutRef.current)
      autoRetryTimeoutRef.current = null
    }

    if (failsafeTimeoutRef.current) {
      clearTimeout(failsafeTimeoutRef.current)
      failsafeTimeoutRef.current = null
    }
  }, [])

  const stopPreviewStream = useCallback(() => {
    if (!previewStreamRef.current) return

    previewStreamRef.current.getTracks().forEach((track) => track.stop())
    previewStreamRef.current = null
  }, [])

  const beginReconnect = useCallback(
    (message = 'Yeniden bağlanılıyor...') => {
      if (sessionExited) return

      clearRecoveryTimers()

      if (retryCount >= MAX_RETRY_COUNT) {
        setRecoveryState('lost')
        setConnectionStatus('Bağlantı koptu')
        return
      }

      setRecoveryState('reconnecting')
      setConnectionStatus(message)

      autoRetryTimeoutRef.current = setTimeout(() => {
        setRetryCount((current) => current + 1)
        setRoomConnectKey((current) => current + 1)
      }, AUTO_RETRY_DELAY_MS)

      failsafeTimeoutRef.current = setTimeout(() => {
        setRecoveryState('lost')
        setConnectionStatus('Bağlantı koptu')
      }, CONNECTION_FAILSAFE_MS)
    },
    [clearRecoveryTimers, retryCount, sessionExited]
  )

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsBrowserOnline(navigator.onLine)
    }

    function handleOnline() {
      setIsBrowserOnline(true)

      if (sessionStarted && !sessionExited && !connected) {
        beginReconnect('İnternet bağlantısı geri geldi. Yeniden bağlanılıyor...')
      }
    }

    function handleOffline() {
      setIsBrowserOnline(false)

      if (sessionStarted && !sessionExited) {
        clearRecoveryTimers()
        setConnected(false)
        setRecoveryState('reconnecting')
        setConnectionStatus('İnternet bağlantısı koptu. Yeniden bağlanma bekleniyor...')
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [
    beginReconnect,
    clearRecoveryTimers,
    connected,
    sessionExited,
    sessionStarted,
  ])

  useEffect(() => {
    if (!sessionStarted || sessionExited) return

    const interval = setInterval(() => {
      if (!sessionStartedAtRef.current) return

      const diff = Math.max(
        0,
        Math.floor((Date.now() - sessionStartedAtRef.current) / 1000)
      )

      setElapsedSeconds(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionExited, sessionStarted])

  useEffect(() => {
    return () => {
      clearRecoveryTimers()
      stopPreviewStream()
    }
  }, [clearRecoveryTimers, stopPreviewStream])

  useEffect(() => {
    if (!sessionId || !accessToken) {
      setError('Güvenli session bağlantısı eksik veya geçersiz.')
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            participantName: 'client-user',
            userType: 'client',
            token: accessToken,
          }),
        })

        const data: SessionResponse = await res.json()

        if (!res.ok || !data.ok || !data.token || !data.url) {
          throw new Error(data.error || 'Session başlatılamadı.')
        }

        if (cancelled) return

        setToken(data.token)
        setServerUrl(data.url)
      } catch (err) {
        console.error('Client session initialize error:', err)

        if (cancelled) return

        setError(
          err instanceof Error
            ? err.message
            : 'Beklenmeyen bir session başlatma hatası oluştu.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    initializeSession()

    return () => {
      cancelled = true
      stopPreviewStream()
    }
  }, [accessToken, sessionId, stopPreviewStream])

  const initializeDevices = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setPermissionState('unsupported')
      setPreviewReady(true)
      return
    }

    try {
      setPermissionState('checking')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })

      previewStreamRef.current = stream

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const microphones = devices.filter((device) => device.kind === 'audioinput')
      const cameras = devices.filter((device) => device.kind === 'videoinput')

      setAudioInputs(microphones)
      setVideoInputs(cameras)

      setDeviceState((current) => ({
        ...current,
        audioInputId: microphones[0]?.deviceId || '',
        videoInputId: cameras[0]?.deviceId || '',
      }))

      setPermissionState('granted')
      setPreviewReady(true)
    } catch (err) {
      console.error('Media permission error:', err)
      setPermissionState('denied')
      setPreviewReady(true)
    }
  }, [])

  useEffect(() => {
    if (!token || !serverUrl || previewReady) return

    initializeDevices()
  }, [initializeDevices, previewReady, serverUrl, token])

  async function refreshPreview(nextState?: Partial<DeviceState>) {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return

    const mergedState = { ...deviceState, ...nextState }

    try {
      stopPreviewStream()

      if (!mergedState.audioEnabled && !mergedState.videoEnabled) {
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: mergedState.audioEnabled
          ? mergedState.audioInputId
            ? { deviceId: { exact: mergedState.audioInputId } }
            : true
          : false,
        video: mergedState.videoEnabled
          ? mergedState.videoInputId
            ? { deviceId: { exact: mergedState.videoInputId } }
            : true
          : false,
      })

      previewStreamRef.current = stream

      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream
      }
    } catch (err) {
      console.error('Preview refresh error:', err)
      setPermissionState('denied')
    }
  }

  function handleDeviceChange(nextState: Partial<DeviceState>) {
    const updatedState = { ...deviceState, ...nextState }

    setDeviceState(updatedState)
    refreshPreview(updatedState)
  }

  function handleJoinSession() {
    stopPreviewStream()
    clearRecoveryTimers()

    setLiveAudioEnabled(deviceState.audioEnabled)
    setLiveVideoEnabled(deviceState.videoEnabled)
    setJoining(true)
    setRecoveryState('idle')
    setRetryCount(0)
    setConnectionStatus('Görüşmeye bağlanılıyor...')
    setSessionStarted(true)
  }

  function handleManualRetry() {
    if (!isBrowserOnline) {
      setRecoveryState('reconnecting')
      setConnectionStatus('İnternet bağlantısı bekleniyor...')
      return
    }

    clearRecoveryTimers()

    setRetryCount(0)
    setRecoveryState('reconnecting')
    setConnectionStatus('Tekrar bağlanılıyor...')
    setRoomConnectKey((current) => current + 1)

    failsafeTimeoutRef.current = setTimeout(() => {
      setRecoveryState('lost')
      setConnectionStatus('Bağlantı koptu')
    }, CONNECTION_FAILSAFE_MS)
  }

  const handleRemoteParticipantCountChange = useCallback(
    (count: number) => {
      setRemoteParticipantCount(count)

      if (count > 0) {
        setRemoteParticipantSeen(true)
        setParticipantState('active')
        return
      }

      setParticipantState(remoteParticipantSeen ? 'remote-left' : 'waiting')
    },
    [remoteParticipantSeen]
  )

  function handleLeaveSession() {
    const confirmed = window.confirm('Görüşmeden ayrılmak istediğine emin misin?')

    if (!confirmed) return

    clearRecoveryTimers()

    setExitReason('left')
    setSessionExited(true)
    setConnected(false)
    setRecoveryState('idle')
    setConnectionStatus('Görüşmeden ayrıldın')
  }

  function handleConnectionLostExit() {
    clearRecoveryTimers()

    setExitReason('connection_lost')
    setSessionExited(true)
    setConnected(false)
    setRecoveryState('idle')
    setConnectionStatus('Bağlantı sonlandı')
  }

  if (loading) {
    return (
      <SessionShell>
        <CenteredCard align="center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />

          <h1 className="mb-3 text-2xl font-semibold text-white">
            Görüşme hazırlanıyor...
          </h1>

          <p className="text-sm leading-6 text-zinc-400">
            Güvenli bağlantı kuruluyor. Kamera ve mikrofon ekranına yönlendirileceksin.
          </p>
        </CenteredCard>
      </SessionShell>
    )
  }

  if (error) {
    return (
      <SessionShell>
        <CenteredCard>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-xl">
            ⚠️
          </div>

          <h1 className="mb-3 text-2xl font-semibold text-red-300">
            Görüşme başlatılamadı
          </h1>

          <p className="mb-6 text-sm leading-6 text-zinc-300">{error}</p>

          <button
            onClick={() => router.back()}
            className="w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Geri Dön
          </button>
        </CenteredCard>
      </SessionShell>
    )
  }

  if (sessionExited) {
    return (
      <SessionShell>
        <CenteredCard align="center">
          <div
            className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl text-2xl ${
              exitReason === 'connection_lost'
                ? 'bg-red-500/10'
                : 'bg-emerald-500/10'
            }`}
          >
            {exitReason === 'connection_lost' ? '⚠️' : '✓'}
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
            Mindora Secure Session
          </p>

          <h1 className="mb-3 text-2xl font-semibold text-white">
            {exitReason === 'connection_lost'
              ? 'Görüşme bağlantısı sonlandı'
              : 'Görüşmeden ayrıldın'}
          </h1>

          <p className="mb-5 text-sm leading-6 text-zinc-400">
            {exitReason === 'connection_lost'
              ? 'Görüşmeye otomatik olarak tekrar bağlanılamadı. Chat ekranına dönüp uzmanla iletişime devam edebilirsin.'
              : 'Görüşme penceresinden güvenli şekilde çıkış yaptın. Danışmanlık mesajlarına chat ekranından devam edebilirsin.'}
          </p>

          <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            Görüşmede kalınan süre: {formatElapsedTime(elapsedSeconds)}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => router.back()}
              className="rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition hover:bg-zinc-200"
            >
              Chat’e Dön
            </button>

            {exitReason === 'connection_lost' && (
              <button
                onClick={() => {
                  setSessionExited(false)
                  setExitReason('left')
                  handleManualRetry()
                }}
                disabled={!isBrowserOnline}
                className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tekrar Bağlan
              </button>
            )}
          </div>
        </CenteredCard>
      </SessionShell>
    )
  }

  if (!sessionStarted) {
    return (
      <SessionShell>
        <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="relative aspect-video bg-zinc-900">
              {permissionState === 'granted' && deviceState.videoEnabled ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 text-3xl">
                    🎥
                  </div>

                  <h2 className="mb-2 text-xl font-semibold text-white">
                    Kamera önizlemesi kapalı
                  </h2>

                  <p className="max-w-md text-sm leading-6 text-zinc-400">
                    Kamera izni verilmemiş olabilir veya kameranı kapalı başlatmayı seçtin.
                  </p>
                </div>
              )}

              <div className="absolute left-4 top-4 rounded-full bg-black/60 px-4 py-2 text-xs font-medium text-white backdrop-blur">
                Danışan Görüşmesi
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-2">
              <button
                onClick={() =>
                  handleDeviceChange({
                    audioEnabled: !deviceState.audioEnabled,
                  })
                }
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  deviceState.audioEnabled
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {deviceState.audioEnabled ? '🎤 Mikrofon Açık' : '🔇 Mikrofon Kapalı'}
              </button>

              <button
                onClick={() =>
                  handleDeviceChange({
                    videoEnabled: !deviceState.videoEnabled,
                  })
                }
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${
                  deviceState.videoEnabled
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {deviceState.videoEnabled ? '📷 Kamera Açık' : '🚫 Kamera Kapalı'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 shadow-2xl">
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Mindora Secure Session
              </p>

              <h1 className="text-2xl font-semibold text-white">
                Görüşmeye katılmadan önce
              </h1>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Kamera ve mikrofon ayarlarını kontrol et. Hazır olduğunda güvenli video görüşmeye bağlanabilirsin.
              </p>
            </div>

            <div className="space-y-4">
              <StatusCard
                title="Güvenli bağlantı"
                value={token && serverUrl ? 'Hazır' : 'Hazırlanıyor'}
                ok={Boolean(token && serverUrl)}
              />

              <StatusCard
                title="Kamera / Mikrofon izni"
                value={
                  permissionState === 'granted'
                    ? 'İzin verildi'
                    : permissionState === 'checking'
                      ? 'Kontrol ediliyor'
                      : permissionState === 'denied'
                        ? 'İzin verilmedi'
                        : permissionState === 'unsupported'
                          ? 'Desteklenmiyor'
                          : 'Bekleniyor'
                }
                ok={permissionState === 'granted'}
              />

              <StatusCard
                title="İnternet bağlantısı"
                value={isBrowserOnline ? 'Online' : 'Offline'}
                ok={isBrowserOnline}
              />

              <DeviceSelect
                label="Mikrofon"
                value={deviceState.audioInputId}
                devices={audioInputs}
                emptyLabel="Mikrofon bulunamadı"
                fallbackPrefix="Mikrofon"
                onChange={(value) => handleDeviceChange({ audioInputId: value })}
              />

              <DeviceSelect
                label="Kamera"
                value={deviceState.videoInputId}
                devices={videoInputs}
                emptyLabel="Kamera bulunamadı"
                fallbackPrefix="Kamera"
                onChange={(value) => handleDeviceChange({ videoInputId: value })}
              />

              {permissionState === 'denied' && (
                <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
                  Kamera veya mikrofon izni verilmedi. Tarayıcı izinlerinden Mindora için kamera/mikrofon erişimini açabilir ya da kamerayı/mikrofonu kapalı başlatabilirsin.
                </div>
              )}

              {!isBrowserOnline && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-100">
                  İnternet bağlantısı yok. Görüşmeye başlamadan önce bağlantını kontrol et.
                </div>
              )}

              <button
                onClick={handleJoinSession}
                disabled={!token || !serverUrl || joining || !isBrowserOnline}
                className="mt-2 w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {joining ? 'Bağlanılıyor...' : 'Görüşmeye Katıl'}
              </button>

              <button
                onClick={() => router.back()}
                className="w-full rounded-2xl border border-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Chat’e Geri Dön
              </button>
            </div>
          </div>
        </div>
      </SessionShell>
    )
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <SessionTopBar
        connectionStatus={connected ? 'Bağlandı' : connectionStatus}
        elapsedSeconds={elapsedSeconds}
        participantState={participantState}
        remoteParticipantCount={remoteParticipantCount}
        isOnline={isBrowserOnline}
        onLeave={handleLeaveSession}
      />

      {!isBrowserOnline && (
        <div className="absolute left-4 right-4 top-[7.5rem] z-20 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 shadow-xl backdrop-blur sm:left-6 sm:right-auto sm:top-28">
          İnternet bağlantısı yok
        </div>
      )}

      {connected && recoveryState === 'idle' && participantState !== 'active' && (
        <WaitingRoomOverlay
          participantState={participantState}
          elapsedSeconds={elapsedSeconds}
        />
      )}

      {recoveryState !== 'idle' && (
        <ConnectionRecoveryOverlay
          state={recoveryState}
          retryCount={retryCount}
          maxRetryCount={MAX_RETRY_COUNT}
          isOnline={isBrowserOnline}
          onRetry={handleManualRetry}
          onBackToChat={() => router.back()}
          onExit={handleConnectionLostExit}
        />
      )}

      <LiveKitRoom
        key={roomConnectKey}
        token={token}
        serverUrl={serverUrl}
        connect={!sessionExited && isBrowserOnline}
        video={
          deviceState.videoEnabled
            ? deviceState.videoInputId
              ? { deviceId: deviceState.videoInputId }
              : true
            : false
        }
        audio={
          deviceState.audioEnabled
            ? deviceState.audioInputId
              ? { deviceId: deviceState.audioInputId }
              : true
            : false
        }
        data-lk-theme="default"
        onConnected={() => {
          clearRecoveryTimers()

          if (!sessionStartedAtRef.current) {
            sessionStartedAtRef.current = Date.now()
          }

          setJoining(false)
          setConnected(true)
          setRetryCount(0)
          setRecoveryState('idle')
          setConnectionStatus('Bağlandı')
        }}
        onDisconnected={() => {
          setConnected(false)

          if (!sessionExited && sessionStarted) {
            beginReconnect('Yeniden bağlanılıyor...')
          }
        }}
        onError={(err) => {
          console.error('LiveKit room error:', err)
          setConnected(false)

          if (!sessionExited && sessionStarted) {
            beginReconnect('Bağlantı hatası oluştu. Yeniden bağlanılıyor...')
          }
        }}
      >
        <ParticipantPresenceBridge onChange={handleRemoteParticipantCountChange} />
        <InCallControls
          audioEnabled={liveAudioEnabled}
          videoEnabled={liveVideoEnabled}
          recoveryState={recoveryState}
          onAudioChange={setLiveAudioEnabled}
          onVideoChange={setLiveVideoEnabled}
          onLeave={handleLeaveSession}
        />
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  )
}


function InCallControls({
  audioEnabled,
  videoEnabled,
  recoveryState,
  onAudioChange,
  onVideoChange,
  onLeave,
}: {
  audioEnabled: boolean
  videoEnabled: boolean
  recoveryState: RecoveryState
  onAudioChange: (enabled: boolean) => void
  onVideoChange: (enabled: boolean) => void
  onLeave: () => void
}) {
  const { localParticipant } = useLocalParticipant()
  const [audioBusy, setAudioBusy] = useState(false)
  const [videoBusy, setVideoBusy] = useState(false)

  async function toggleMicrophone() {
    if (!localParticipant || audioBusy) return

    const nextValue = !audioEnabled

    try {
      setAudioBusy(true)
      await localParticipant.setMicrophoneEnabled(nextValue)
      onAudioChange(nextValue)
    } catch (err) {
      console.error('Client microphone toggle error:', err)
    } finally {
      setAudioBusy(false)
    }
  }

  async function toggleCamera() {
    if (!localParticipant || videoBusy) return

    const nextValue = !videoEnabled

    try {
      setVideoBusy(true)
      await localParticipant.setCameraEnabled(nextValue)
      onVideoChange(nextValue)
    } catch (err) {
      console.error('Client camera toggle error:', err)
    } finally {
      setVideoBusy(false)
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-30 flex justify-center px-4 sm:bottom-6">
      <div className="pointer-events-auto flex w-full max-w-xl flex-wrap items-center justify-center gap-3 rounded-3xl border border-white/10 bg-black/75 p-3 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={toggleMicrophone}
          disabled={audioBusy || recoveryState !== 'idle'}
          className={`min-w-[132px] rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            audioEnabled
              ? 'bg-white text-black hover:bg-zinc-200'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {audioBusy
            ? 'Mikrofon...'
            : audioEnabled
              ? '🎤 Mikrofon Açık'
              : '🔇 Mikrofon Kapalı'}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          disabled={videoBusy || recoveryState !== 'idle'}
          className={`min-w-[132px] rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            videoEnabled
              ? 'bg-white text-black hover:bg-zinc-200'
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {videoBusy
            ? 'Kamera...'
            : videoEnabled
              ? '📷 Kamera Açık'
              : '🚫 Kamera Kapalı'}
        </button>

        <button
          type="button"
          onClick={onLeave}
          className="min-w-[132px] rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
        >
          Chat’e Dön
        </button>
      </div>
    </div>
  )
}

function SessionShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_35%)]" />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  )
}

function CenteredCard({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'center'
}) {
  return (
    <div
      className={`mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950/90 p-8 shadow-2xl ${
        align === 'center' ? 'text-center' : ''
      }`}
    >
      {children}
    </div>
  )
}

function StatusCard({
  title,
  value,
  ok,
}: {
  title: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3">
      <div>
        <p className="text-xs text-zinc-500">{title}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>

      <div
        className={`h-3 w-3 rounded-full ${
          ok ? 'bg-emerald-400' : 'bg-yellow-400'
        }`}
      />
    </div>
  )
}

function DeviceSelect({
  label,
  value,
  devices,
  emptyLabel,
  fallbackPrefix,
  onChange,
}: {
  label: string
  value: string
  devices: MediaDeviceInfo[]
  emptyLabel: string
  fallbackPrefix: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-zinc-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!devices.length}
        className="w-full rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white outline-none transition focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {devices.length ? (
          devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `${fallbackPrefix} ${index + 1}`}
            </option>
          ))
        ) : (
          <option>{emptyLabel}</option>
        )}
      </select>
    </div>
  )
}

function SessionTopBar({
  connectionStatus,
  elapsedSeconds,
  participantState,
  remoteParticipantCount,
  isOnline,
  onLeave,
}: {
  connectionStatus: string
  elapsedSeconds: number
  participantState: ParticipantState
  remoteParticipantCount: number
  isOnline: boolean
  onLeave: () => void
}) {
  return (
    <div className="absolute left-0 right-0 top-0 z-20 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 rounded-3xl border border-white/10 bg-black/75 p-3 text-white shadow-2xl backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-xs text-zinc-400">
            Mindora Secure Session
          </p>
          <p className="truncate text-sm font-semibold">{connectionStatus}</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
          <HeaderPill label="Süre" value={formatElapsedTime(elapsedSeconds)} ok />

          <HeaderPill
            label="Katılımcı"
            value={
              participantState === 'active'
                ? `${remoteParticipantCount + 1} kişi`
                : participantState === 'remote-left'
                  ? 'Karşı taraf ayrıldı'
                  : 'Uzman bekleniyor'
            }
            ok={participantState === 'active'}
          />

          <HeaderPill
            label="Ağ"
            value={isOnline ? 'Online' : 'Offline'}
            ok={isOnline}
          />

          <button
            onClick={onLeave}
            className="ml-auto rounded-2xl bg-red-500 px-4 py-3 text-xs font-bold text-white shadow-xl transition hover:bg-red-600 sm:ml-2 sm:px-5 sm:text-sm"
          >
            Görüşmeden Ayrıl
          </button>
        </div>
      </div>
    </div>
  )
}

function HeaderPill({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="min-w-[92px] rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">
        {label}
      </p>

      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            ok ? 'bg-emerald-400' : 'bg-yellow-400'
          }`}
        />
        <p className="truncate text-xs font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

function WaitingRoomOverlay({
  participantState,
  elapsedSeconds,
}: {
  participantState: ParticipantState
  elapsedSeconds: number
}) {
  const isRemoteLeft = participantState === 'remote-left'

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-6 z-20 flex justify-center sm:bottom-8">
      <div className="pointer-events-auto w-full max-w-md rounded-3xl border border-white/10 bg-black/75 p-5 text-center text-white shadow-2xl backdrop-blur">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl">
          {isRemoteLeft ? '⚠️' : '⏳'}
        </div>

        <h2 className="mb-2 text-lg font-semibold">
          {isRemoteLeft ? 'Uzmanın bağlantısı koptu' : 'Uzman bekleniyor...'}
        </h2>

        <p className="text-sm leading-6 text-zinc-400">
          {isRemoteLeft
            ? 'Karşı taraf görüşmeden ayrıldı veya bağlantısı kesildi. Kısa süre içinde tekrar bağlanabilir.'
            : 'Görüşme odasındasın. Uzman bağlandığında görüşme otomatik olarak aktif görünecek.'}
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
          Bekleme / görüşme süresi: {formatElapsedTime(elapsedSeconds)}
        </div>
      </div>
    </div>
  )
}

function ParticipantPresenceBridge({
  onChange,
}: {
  onChange: (remoteParticipantCount: number) => void
}) {
  const participants = useParticipants()

  useEffect(() => {
    const remoteParticipants = participants.filter(
      (participant) => !participant.isLocal
    )

    onChange(remoteParticipants.length)
  }, [onChange, participants])

  return null
}

function ConnectionRecoveryOverlay({
  state,
  retryCount,
  maxRetryCount,
  isOnline,
  onRetry,
  onBackToChat,
  onExit,
}: {
  state: RecoveryState
  retryCount: number
  maxRetryCount: number
  isOnline: boolean
  onRetry: () => void
  onBackToChat: () => void
  onExit: () => void
}) {
  const isLost = state === 'lost'

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-950 p-7 text-center shadow-2xl">
        {!isLost ? (
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
        ) : (
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-2xl">
            ⚠️
          </div>
        )}

        <h2 className="mb-3 text-2xl font-semibold text-white">
          {isLost ? 'Bağlantı koptu' : 'Yeniden bağlanılıyor...'}
        </h2>

        <p className="mb-5 text-sm leading-6 text-zinc-400">
          {isLost
            ? 'Görüşmeye otomatik olarak tekrar bağlanılamadı. Bağlantını kontrol edip yeniden deneyebilirsin.'
            : isOnline
              ? 'Kısa süreli bağlantı problemi algılandı. Mindora görüşmeyi otomatik olarak kurtarmaya çalışıyor.'
              : 'İnternet bağlantısı yok. Bağlantı geri geldiğinde yeniden bağlanmayı deneyeceğiz.'}
        </p>

        <div className="mb-6 rounded-2xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          Deneme: {Math.min(retryCount + 1, maxRetryCount)} / {maxRetryCount}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={onRetry}
            disabled={!isOnline}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Tekrar Dene
          </button>

          <button
            onClick={isLost ? onExit : onBackToChat}
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Chat’e Dön
          </button>
        </div>
      </div>
    </div>
  )
}

function formatElapsedTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds)
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  if (hours > 0) {
    return `${padTime(hours)}:${padTime(minutes)}:${padTime(seconds)}`
  }

  return `${padTime(minutes)}:${padTime(seconds)}`
}

function padTime(value: number) {
  return String(value).padStart(2, '0')
}