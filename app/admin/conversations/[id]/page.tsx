'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import AdminHeader from '@/components/AdminHeader'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type SenderType = 'client' | 'expert' | 'admin'

type Conversation = {
  id: string
  client_application_id: string | null
  expert_id: string | null
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  conversation_id: string
  sender_type: SenderType
  sender_name: string | null
  message: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
}

type TypingPayload = {
  senderType: SenderType
  senderName: string
  isTyping: boolean
}

type PresenceMeta = {
  userType?: SenderType
  userName?: string
  onlineAt?: string
  conversationId?: string
}

type OnlineUsers = {
  client: boolean
  expert: boolean
}

type AvailabilityRow = {
  id: string
  expert_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration_minutes: number
  buffer_minutes: number
  timezone: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

type Slot = {
  expertId: string
  startAt: string
  endAt: string
  timezone: string
  slotDurationMinutes: number
  bufferMinutes?: number
}

type SlotsResponse = {
  ok: boolean
  slots?: Slot[]
  error?: string
}

type AvailabilityResponse = {
  ok: boolean
  availability?: AvailabilityRow[]
  error?: string
}

type Booking = {
  id: string
  expert_id: string
  client_id?: string | null
  conversation_id?: string | null
  scheduled_start_at: string
  scheduled_end_at: string
  timezone: string
  status: 'scheduled' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
  live_session_id?: string | null
  session_ready?: boolean | null
  session_ready_at?: string | null
  client_join_url?: string | null
  expert_join_url?: string | null
  admin_join_url?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

type BookingStatus = Booking['status']

type BookingResponse = {
  ok: boolean
  booking?: Booking
  error?: string
}

type BookingsResponse = {
  ok: boolean
  bookings?: Booking[]
  error?: string
}

type PrepareBookingResponse = {
  ok: boolean
  booking?: Booking
  liveSessionId?: string
  joinUrls?: {
    client?: string
    expert?: string
    admin?: string
  }
  error?: string
}

type SendBookingLinksResponse = {
  ok: boolean
  sent?: boolean
  booking?: Booking
  recipients?: {
    client?: string | null
    expert?: string | null
  }
  error?: string
}

const DEFAULT_TIMEZONE = 'Europe/Istanbul'
const DEFAULT_LOOKAHEAD_DAYS = 14

function formatDate(date?: string | null) {
  if (!date) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

function formatCompactDate(date?: string | null) {
  if (!date) return '-'

  try {
    return new Intl.DateTimeFormat('tr-TR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date))
  } catch {
    return '-'
  }
}

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0]
}

function getDefaultStartDate() {
  return formatDateInput(new Date())
}

function getDefaultEndDate() {
  const end = new Date()
  end.setDate(end.getDate() + DEFAULT_LOOKAHEAD_DAYS)
  return formatDateInput(end)
}

function getStatusLabel(status?: string) {
  if (status === 'active') return 'Aktif'
  if (status === 'locked') return 'Kilitli'
  if (status === 'closed') return 'Kapalı'
  return '-'
}

function getBookingStatusLabel(status?: string) {
  if (status === 'scheduled') return 'Planlandı'
  if (status === 'confirmed') return 'Onaylandı'
  if (status === 'active') return 'Aktif'
  if (status === 'completed') return 'Tamamlandı'
  if (status === 'cancelled') return 'İptal'
  if (status === 'no_show') return 'Katılmadı'
  if (status === 'rescheduled') return 'Ertelendi'
  return '-'
}

function getBookingStatusClass(status?: string) {
  if (status === 'completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'active') return 'bg-blue-50 text-blue-700 ring-blue-100'
  if (status === 'confirmed') return 'bg-purple-50 text-purple-700 ring-purple-100'
  if (status === 'scheduled') return 'bg-amber-50 text-amber-700 ring-amber-100'
  if (status === 'cancelled' || status === 'no_show') return 'bg-red-50 text-red-700 ring-red-100'
  return 'bg-zinc-100 text-zinc-600 ring-zinc-200'
}

function getSessionTimingState(booking?: Booking | null) {
  if (!booking) return 'none'

  const now = Date.now()
  const start = new Date(booking.scheduled_start_at).getTime()
  const end = new Date(booking.scheduled_end_at).getTime()
  const joinWindowStart = start - 15 * 60 * 1000
  const joinWindowEnd = end + 15 * 60 * 1000

  if (booking.status === 'completed') return 'completed'
  if (booking.status === 'cancelled' || booking.status === 'no_show') return 'closed'
  if (now < joinWindowStart) return 'upcoming'
  if (now >= joinWindowStart && now <= joinWindowEnd) return 'joinable'
  if (now > joinWindowEnd) return 'expired'

  return 'upcoming'
}

function getPaymentLabel(status?: string) {
  if (status === 'paid') return 'Ödendi'
  if (status === 'pending') return 'Ödeme Bekliyor'
  if (status === 'failed') return 'Başarısız'
  if (status === 'refunded') return 'İade'
  return '-'
}

function getSenderLabel(sender: SenderType) {
  if (sender === 'client') return 'Danışan'
  if (sender === 'expert') return 'Uzman'
  return 'Admin'
}

function getSenderName(sender: SenderType) {
  if (sender === 'admin') return 'Mindora Admin'
  if (sender === 'expert') return 'Uzman'
  return 'Danışan'
}

function getTypingText(senderType: SenderType) {
  if (senderType === 'client') return 'Danışan yazıyor...'
  if (senderType === 'expert') return 'Uzman yazıyor...'
  return 'Mindora yazıyor...'
}

function getSenderStyle(sender: SenderType) {
  if (sender === 'admin') return 'ml-auto bg-black text-white'
  if (sender === 'expert') {
    return 'mr-auto bg-purple-50 text-purple-950 ring-1 ring-purple-100'
  }

  return 'mr-auto bg-white text-[#2b2118] ring-1 ring-black/10'
}

function getDayName(day: number) {
  const days = [
    'Pazar',
    'Pazartesi',
    'Salı',
    'Çarşamba',
    'Perşembe',
    'Cuma',
    'Cumartesi',
  ]

  return days[day] || '-'
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  )
}

export default function AdminConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [conversationId, setConversationId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [senderType, setSenderType] = useState<SenderType>('admin')
  const [loading, setLoading] = useState(true)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [typingUser, setTypingUser] = useState<TypingPayload | null>(null)
  const [readSynced, setReadSynced] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({
    client: false,
    expert: false,
  })

  const [availability, setAvailability] = useState<AvailabilityRow[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [slotStartDate, setSlotStartDate] = useState(getDefaultStartDate)
  const [slotEndDate, setSlotEndDate] = useState(getDefaultEndDate)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  const [scheduleSuccess, setScheduleSuccess] = useState('')
  const [lastBookingId, setLastBookingId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState('')
  const [bookingActionLoadingId, setBookingActionLoadingId] = useState('')
  const [bookingActionError, setBookingActionError] = useState('')
  const [bookingActionSuccess, setBookingActionSuccess] = useState('')
  const [prepareLoadingId, setPrepareLoadingId] = useState('')
  const [sendLinksLoadingId, setSendLinksLoadingId] = useState('')

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const localTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  const flaggedMessages = useMemo(
    () => messages.filter((item) => item.is_flagged),
    [messages]
  )

  const expertId = conversation?.expert_id?.trim() || ''
  const safeExpertId = isValidUuid(expertId) ? expertId : ''
  const canUseScheduling = Boolean(conversationId && safeExpertId)
  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots])
  const activeAvailability = useMemo(
    () => availability.filter((item) => item.is_active),
    [availability]
  )

  const upcomingBooking = useMemo(() => {
    const now = Date.now()

    return (
      bookings.find((booking) => {
        const end = new Date(booking.scheduled_end_at).getTime()
        return (
          ['scheduled', 'confirmed', 'active'].includes(booking.status) &&
          end >= now - 15 * 60 * 1000
        )
      }) || null
    )
  }, [bookings])

  const latestBookings = useMemo(() => bookings.slice(0, 5), [bookings])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  async function markConversationAsRead(id: string) {
    try {
      setReadSynced(false)

      const res = await fetch(`/api/conversations/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType: 'admin',
          role: 'admin',
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error('ADMIN READ SYNC ERROR:', data?.error || 'Read sync failed')
        return
      }

      setReadSynced(true)
    } catch (err) {
      console.error('ADMIN READ SYNC ERROR:', err)
    }
  }

  async function loadMessages(id: string, showLoading = true) {
    try {
      if (showLoading) setLoading(true)
      setError('')

      const res = await fetch(`/api/conversations/${id}/messages?role=admin`, {
        cache: 'no-store',
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        setError(data.error || 'Konuşma alınamadı.')
        return
      }

      setConversation(data.conversation)
      setMessages(data.messages || [])

      await markConversationAsRead(id)
      await loadBookings(id)
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function loadBookings(currentConversationId = conversationId) {
    if (!currentConversationId) return

    try {
      setBookingsLoading(true)
      setBookingsError('')

      const query = new URLSearchParams({
        conversationId: currentConversationId,
      })

      const res = await fetch(`/api/sessions/bookings?${query.toString()}`, {
        cache: 'no-store',
      })

      const data = (await res.json()) as BookingsResponse

      if (!res.ok || !data.ok) {
        setBookingsError(data.error || 'Randevular alınamadı.')
        setBookings([])
        return
      }

      setBookings(data.bookings || [])
    } catch {
      setBookingsError('Randevular alınırken hata oluştu.')
      setBookings([])
    } finally {
      setBookingsLoading(false)
    }
  }

  async function loadAvailability(currentExpertId?: string) {
    const targetExpertId = (currentExpertId || safeExpertId || '').trim()

    if (!isValidUuid(targetExpertId)) {
      setAvailability([])
      return
    }

    try {
      setScheduleError('')

      const res = await fetch(
        `/api/expert/availability?expertId=${encodeURIComponent(targetExpertId)}`,
        { cache: 'no-store' }
      )

      const data = (await res.json()) as AvailabilityResponse

      if (!res.ok || !data.ok) {
        setScheduleError(data.error || 'Uzman müsaitliği alınamadı.')
        return
      }

      setAvailability(data.availability || [])
    } catch {
      setScheduleError('Uzman müsaitliği alınırken hata oluştu.')
    }
  }

  async function loadSlots(currentExpertId?: string) {
    const targetExpertId = (currentExpertId || safeExpertId || '').trim()

    if (!isValidUuid(targetExpertId)) {
      setScheduleError(
        'Geçerli uzman ID bulunamadı. Konuşmanın bir uzmana atanmış olduğundan emin ol.'
      )
      setSlots([])
      return
    }

    try {
      setSlotsLoading(true)
      setScheduleError('')
      setScheduleSuccess('')
      setSelectedSlot(null)

      const query = new URLSearchParams({
        expertId: targetExpertId,
        startDate: slotStartDate,
        endDate: slotEndDate,
      })

      const res = await fetch(`/api/sessions/slots?${query.toString()}`, {
        cache: 'no-store',
      })

      const data = (await res.json()) as SlotsResponse

      if (!res.ok || !data.ok) {
        setScheduleError(data.error || 'Uygun slotlar alınamadı.')
        setSlots([])
        return
      }

      setSlots(data.slots || [])
    } catch {
      setScheduleError('Slotlar alınırken hata oluştu.')
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  async function createBooking() {
    if (!selectedSlot) {
      setScheduleError('Önce bir randevu saati seç.')
      return
    }

    if (!conversation || !conversation.expert_id) {
      setScheduleError('Konuşmaya bağlı uzman bulunamadı.')
      return
    }

    try {
      setBookingLoading(true)
      setScheduleError('')
      setScheduleSuccess('')

      const res = await fetch('/api/sessions/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: conversation.expert_id,
          clientId: null,
          conversationId,
          startAt: selectedSlot.startAt,
          endAt: selectedSlot.endAt,
          timezone: selectedSlot.timezone || DEFAULT_TIMEZONE,
          createdBy: 'admin',
        }),
      })

      const data = (await res.json()) as BookingResponse

      if (!res.ok || !data.ok) {
        setScheduleError(data.error || 'Randevu oluşturulamadı.')
        return
      }

      setLastBookingId(data.booking?.id || '')
      setScheduleSuccess(
        `Randevu oluşturuldu: ${formatCompactDate(selectedSlot.startAt)}`
      )
      setSelectedSlot(null)
      await loadSlots(conversation.expert_id || safeExpertId)
      await loadBookings(conversationId)
    } catch {
      setScheduleError('Randevu oluşturulurken hata oluştu.')
    } finally {
      setBookingLoading(false)
    }
  }

  async function updateBookingStatus(
    booking: Booking,
    status: BookingStatus
  ) {
    if (!booking?.id) return

    const statusLabel = getBookingStatusLabel(status)
    let cancellationReason = ''

    if (status === 'cancelled') {
      const reason = window.prompt(
        'Randevuyu neden iptal ediyorsun? Kısa bir sebep yazabilirsin.',
        'Admin tarafından iptal edildi.'
      )

      if (reason === null) return
      cancellationReason = reason.trim()
    }

    const shouldConfirm = window.confirm(
      `Randevu durumu "${statusLabel}" olarak güncellensin mi?`
    )

    if (!shouldConfirm) return

    try {
      setBookingActionLoadingId(booking.id)
      setBookingActionError('')
      setBookingActionSuccess('')

      const res = await fetch(`/api/sessions/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          cancellationReason,
        }),
      })

      const data = (await res.json()) as BookingResponse

      if (!res.ok || !data.ok) {
        setBookingActionError(data.error || 'Randevu durumu güncellenemedi.')
        return
      }

      setBookingActionSuccess(`Randevu durumu güncellendi: ${statusLabel}`)
      await loadBookings(conversationId)
      if (safeExpertId) await loadSlots(safeExpertId)
    } catch {
      setBookingActionError('Randevu durumu güncellenirken hata oluştu.')
    } finally {
      setBookingActionLoadingId('')
    }
  }

  async function prepareBookingSession(booking: Booking) {
    if (!booking?.id) return

    const shouldConfirm = window.confirm(
      'Bu randevu için güvenli video görüşme altyapısı hazırlansın mı?'
    )

    if (!shouldConfirm) return

    try {
      setPrepareLoadingId(booking.id)
      setBookingActionError('')
      setBookingActionSuccess('')

      const res = await fetch(`/api/sessions/bookings/${booking.id}/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = (await res.json()) as PrepareBookingResponse

      if (!res.ok || !data.ok) {
        setBookingActionError(data.error || 'Görüşme hazırlanamadı.')
        return
      }

      setBookingActionSuccess('Görüşme hazırlandı. Join linkleri oluşturuldu.')
      await loadBookings(conversationId)
      if (safeExpertId) await loadSlots(safeExpertId)
    } catch {
      setBookingActionError('Görüşme hazırlanırken hata oluştu.')
    } finally {
      setPrepareLoadingId('')
    }
  }

  async function sendBookingLinks(booking: Booking) {
    if (!booking?.id) return

    if (!booking.session_ready) {
      setBookingActionError('Önce görüşmeyi hazırla. Join linkleri oluşmadan mail gönderilemez.')
      return
    }

    if (!booking.client_join_url || !booking.expert_join_url) {
      setBookingActionError('Client veya expert join linki eksik. Görüşmeyi tekrar hazırla.')
      return
    }

    const shouldConfirm = window.confirm(
      'Danışan ve uzmana güvenli görüşme linkleri mail olarak gönderilsin mi?'
    )

    if (!shouldConfirm) return

    try {
      setSendLinksLoadingId(booking.id)
      setBookingActionError('')
      setBookingActionSuccess('')

      const res = await fetch(`/api/sessions/bookings/${booking.id}/send-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = (await res.json()) as SendBookingLinksResponse

      if (!res.ok || !data.ok) {
        setBookingActionError(data.error || 'Görüşme linkleri mail olarak gönderilemedi.')
        return
      }

      setBookingActionSuccess('Görüşme linkleri danışan ve uzmana mail olarak gönderildi.')
      await loadBookings(conversationId)
    } catch {
      setBookingActionError('Görüşme linkleri gönderilirken hata oluştu.')
    } finally {
      setSendLinksLoadingId('')
    }
  }

  async function broadcastTyping(activeSenderType: SenderType, isTyping: boolean) {
    if (!channelRef.current) return
    if (!conversationId) return

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          senderType: activeSenderType,
          senderName: getSenderName(activeSenderType),
          isTyping,
        } satisfies TypingPayload,
      })
    } catch (err) {
      console.error('ADMIN TYPING BROADCAST ERROR:', err)
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value)

    broadcastTyping(senderType, value.trim().length > 0)

    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current)
    }

    localTypingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(senderType, false)
    }, 2500)
  }

  async function sendMessage() {
    const cleanMessage = message.trim()

    if (!cleanMessage) {
      alert('Mesaj boş olamaz.')
      return
    }

    if (!conversationId) {
      alert('Conversation ID bulunamadı.')
      return
    }

    try {
      setSending(true)
      await broadcastTyping(senderType, false)

      const res = await fetch(
        `/api/conversations/${conversationId}/messages?role=admin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderType,
            senderName: getSenderName(senderType),
            message: cleanMessage,
            role: 'admin',
          }),
        }
      )

      const data = await res.json()

      if (!res.ok || !data.ok) {
        alert(data.error || 'Mesaj gönderilemedi.')
        await loadMessages(conversationId, false)
        return
      }

      setMessage('')
      await loadMessages(conversationId, false)
    } catch {
      alert('Mesaj gönderilirken hata oluştu.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    async function init() {
      const resolved = await params
      setConversationId(resolved.id)
      await loadMessages(resolved.id)
    }

    init()
  }, [params])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUser])

  useEffect(() => {
    if (!expertId) return

    loadAvailability(safeExpertId)
    loadSlots(safeExpertId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeExpertId])

  useEffect(() => {
    if (!conversationId) return

    let isMounted = true

    try {
      const supabase = createMindoraRealtimeClient()

      const channel = supabase
        .channel(`mindora-conversation-${conversationId}`, {
          config: {
            broadcast: {
              self: false,
            },
            presence: {
              key: `admin-${conversationId}`,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return

          const presenceState = channel.presenceState()
          let clientOnline = false
          let expertOnline = false

          Object.values(presenceState).forEach((presences) => {
            presences.forEach((presence) => {
              const meta = presence as PresenceMeta

              if (meta.userType === 'client') clientOnline = true
              if (meta.userType === 'expert') expertOnline = true
            })
          })

          setOnlineUsers({
            client: clientOnline,
            expert: expertOnline,
          })
        })
        .on(
          'broadcast',
          { event: 'typing' },
          ({ payload }: { payload: TypingPayload }) => {
            if (!isMounted) return
            if (!payload) return
            if (payload.senderType === 'admin') return

            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current)
            }

            if (payload.isTyping) {
              setTypingUser(payload)

              typingTimeoutRef.current = setTimeout(() => {
                setTypingUser(null)
              }, 3500)
            } else {
              setTypingUser(null)
            }
          }
        )
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
            setTypingUser(null)
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
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'session_bookings',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async () => {
            if (!isMounted) return
            await loadBookings(conversationId)
            if (safeExpertId) await loadSlots(safeExpertId)
          }
        )
        .subscribe(async (status) => {
          if (!isMounted) return

          if (status === 'SUBSCRIBED') {
            setRealtimeReady(true)

            await channel.track({
              userType: 'admin',
              userName: 'Mindora Admin',
              onlineAt: new Date().toISOString(),
              conversationId,
            } satisfies PresenceMeta)
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            setRealtimeReady(false)
            setOnlineUsers({
              client: false,
              expert: false,
            })
          }
        })

      channelRef.current = channel

      return () => {
        isMounted = false
        setRealtimeReady(false)
        setTypingUser(null)
        setReadSynced(false)
        setOnlineUsers({
          client: false,
          expert: false,
        })
        channelRef.current = null

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        if (localTypingTimeoutRef.current) {
          clearTimeout(localTypingTimeoutRef.current)
        }

        channel.untrack()
        supabase.removeChannel(channel)
      }
    } catch (err) {
      console.error('ADMIN REALTIME ERROR:', err)
      setRealtimeReady(false)
      setOnlineUsers({
        client: false,
        expert: false,
      })
    }
    }, [conversationId, safeExpertId])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-8 text-[#171717] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <AdminHeader />

        <div className="mb-6">
          <Link
            href="/admin/danisan-basvurulari"
            className="text-sm font-black text-[#6b5c4d] underline underline-offset-4"
          >
            ← Danışan başvurularına dön
          </Link>
        </div>

        <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Moderasyon
              </p>

              <h1 className="mt-2 text-3xl font-black text-[#2b2118]">
                Konuşma Detayı
              </h1>

              <p className="mt-2 max-w-2xl break-all text-sm font-semibold text-[#6b5c4d]">
                Conversation ID: {conversationId || '-'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill
                  active={realtimeReady}
                  activeText="Realtime aktif"
                  inactiveText="Realtime bağlanıyor"
                />

                <StatusPill
                  active={onlineUsers.client}
                  activeText="Danışan çevrimiçi"
                  inactiveText="Danışan çevrimdışı"
                />

                <StatusPill
                  active={onlineUsers.expert}
                  activeText="Uzman çevrimiçi"
                  inactiveText="Uzman çevrimdışı"
                />

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  Mindora Aktif
                </span>

                <StatusPill
                  active={readSynced}
                  activeText="Okundu senkron"
                  inactiveText="Okundu bekliyor"
                  tone="blue"
                />
              </div>
            </div>

            <button
              onClick={() => conversationId && loadMessages(conversationId)}
              disabled={loading}
              className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Yenile
            </button>
          </div>

          {conversation && (
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <MetricCard
                title="Chat Durumu"
                value={getStatusLabel(conversation.status)}
              />
              <MetricCard
                title="Ödeme"
                value={getPaymentLabel(conversation.payment_status)}
                valueClassName="text-green-700"
              />
              <MetricCard title="Mesaj" value={String(messages.length)} />
              <MetricCard
                title="Randevu"
                value={upcomingBooking ? getBookingStatusLabel(upcomingBooking.status) : 'Yok'}
                valueClassName={upcomingBooking ? 'text-purple-700' : 'text-[#2b2118]'}
              />
              <MetricCard
                title="Flagged"
                value={String(flaggedMessages.length)}
                variant="danger"
              />
            </div>
          )}
        </section>

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">Konuşma yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-3xl bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="font-bold text-red-700">{error}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_380px]">
            <section className="rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-black/10 pb-4">
                <div>
                  <h2 className="text-xl font-black text-[#2b2118]">
                    Mesaj Akışı
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-[#6b5c4d]">
                    Platform içi iletişim ve kaçak iletişim kontrolleri.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex max-h-[560px] min-h-[420px] flex-col overflow-y-auto rounded-2xl bg-[#faf7f2] p-4">
                {messages.length === 0 ? (
                  <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/5">
                    <p className="font-bold text-[#6b5c4d]">
                      Henüz mesaj yok.
                    </p>
                  </div>
                ) : (
                  <div className="mt-auto space-y-4">
                    {messages.map((item) => (
                      <div key={item.id} className="flex">
                        <div
                          className={`max-w-[82%] rounded-2xl p-4 text-sm shadow-sm ${getSenderStyle(
                            item.sender_type
                          )}`}
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-[0.15em] opacity-80">
                              {getSenderLabel(item.sender_type)}
                            </span>

                            {item.sender_name && (
                              <span className="text-xs font-bold opacity-70">
                                {item.sender_name}
                              </span>
                            )}

                            {item.is_flagged && (
                              <span className="rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                                🚨 FLAGGED
                              </span>
                            )}
                          </div>

                          <p className="whitespace-pre-wrap break-words leading-6">
                            {item.message}
                          </p>

                          {item.is_flagged && (
                            <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 ring-1 ring-red-100">
                              Sebep: {item.flag_reason || 'contact_leak'}
                            </div>
                          )}

                          <p className="mt-3 text-[11px] font-semibold opacity-60">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {typingUser && (
                      <div className="flex">
                        <div className="mr-auto rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#6b5c4d] shadow-sm ring-1 ring-black/10">
                          <span className="inline-flex items-center gap-1">
                            {getTypingText(typingUser.senderType)}
                            <span className="ml-1 inline-flex gap-1">
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8a7662]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8a7662] [animation-delay:120ms]" />
                              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#8a7662] [animation-delay:240ms]" />
                            </span>
                          </span>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-black/10 bg-white p-4">
                <div className="mb-3 flex flex-col gap-3 md:flex-row">
                  <select
                    value={senderType}
                    onChange={(event) => {
                      broadcastTyping(senderType, false)
                      setSenderType(event.target.value as SenderType)
                    }}
                    className="h-11 rounded-full border border-black/10 bg-[#faf7f2] px-4 text-sm font-black outline-none"
                  >
                    <option value="admin">Admin olarak gönder</option>
                    <option value="client">Danışan gibi test et</option>
                    <option value="expert">Uzman gibi test et</option>
                  </select>

                  <button
                    onClick={sendMessage}
                    disabled={sending || !message.trim()}
                    className="rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50 md:ml-auto"
                  >
                    {sending ? 'Gönderiliyor...' : 'Mesaj Gönder'}
                  </button>
                </div>

                <textarea
                  value={message}
                  onChange={(event) => handleMessageChange(event.target.value)}
                  placeholder="Admin mesajı yaz... Telefon, e-posta, WhatsApp, IBAN gibi bilgiler client/expert testinde flaglenir."
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-2xl border border-black/10 bg-[#faf7f2] p-4 text-sm font-semibold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30"
                />

                <p className="mt-2 text-xs font-semibold text-[#8a7662]">
                  {message.length}/2000 karakter
                </p>
              </div>
            </section>

            <aside className="space-y-5">

              <UpcomingSessionCard
                booking={upcomingBooking}
                bookings={latestBookings}
                loading={bookingsLoading}
                error={bookingsError}
                conversationId={conversationId}
                actionLoadingId={bookingActionLoadingId}
                prepareLoadingId={prepareLoadingId}
                sendLinksLoadingId={sendLinksLoadingId}
                actionError={bookingActionError}
                actionSuccess={bookingActionSuccess}
                onRefresh={() => loadBookings(conversationId)}
                onStatusChange={updateBookingStatus}
                onPrepareSession={prepareBookingSession}
                onSendLinks={sendBookingLinks}
              />

              <div className="rounded-[2rem] border border-[#d8c8b8] bg-[#2b2118] p-5 text-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c9b8a7]">
                      C7 Scheduling
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      Randevu Planla
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-[#e7d8c8]">
                      Uzmanın müsait slotlarını çek, danışan için güvenli randevu oluştur.
                    </p>
                    {safeExpertId && (
                      <p className="mt-2 break-all text-[11px] font-bold text-[#c9b8a7]">
                        Expert: {safeExpertId}
                      </p>
                    )}
                  </div>

                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white ring-1 ring-white/10">
                    Admin
                  </span>
                </div>

                {!canUseScheduling ? (
                  <div className="mt-5 rounded-2xl border border-yellow-300/20 bg-yellow-300/10 p-4 text-sm font-bold text-yellow-100">
                    Bu konuşmaya bağlı expert_id bulunamadı. Randevu planlamak için konuşmanın bir uzmana atanmış olması gerekir.
                  </div>
                ) : (
                  <>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-[#c9b8a7]">
                          Başlangıç
                        </label>
                        <input
                          type="date"
                          value={slotStartDate}
                          onChange={(event) => setSlotStartDate(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.15em] text-[#c9b8a7]">
                          Bitiş
                        </label>
                        <input
                          type="date"
                          value={slotEndDate}
                          onChange={(event) => setSlotEndDate(event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white outline-none"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => loadSlots(safeExpertId)}
                      disabled={slotsLoading}
                      className="mt-4 w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#2b2118] transition hover:bg-[#f3eadf] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {slotsLoading ? 'Slotlar yükleniyor...' : 'Uygun Slotları Getir'}
                    </button>

                    {scheduleError && (
                      <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/15 p-4 text-sm font-bold text-red-100">
                        {scheduleError}
                      </div>
                    )}

                    {scheduleSuccess && (
                      <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/15 p-4 text-sm font-bold text-emerald-100">
                        {scheduleSuccess}
                        {lastBookingId && (
                          <p className="mt-1 break-all text-xs opacity-80">
                            Booking ID: {lastBookingId}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-5 max-h-[360px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">
                      {slotsLoading ? (
                        <p className="p-4 text-center text-sm font-bold text-[#e7d8c8]">
                          Slotlar hesaplanıyor...
                        </p>
                      ) : slots.length === 0 ? (
                        <p className="p-4 text-center text-sm font-bold text-[#e7d8c8]">
                          Bu tarih aralığında uygun slot yok.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(groupedSlots).map(([dateKey, daySlots]) => (
                            <div key={dateKey}>
                              <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[#c9b8a7]">
                                {dateKey}
                              </p>

                              <div className="grid grid-cols-2 gap-2">
                                {daySlots.map((slot) => {
                                  const isSelected =
                                    selectedSlot?.startAt === slot.startAt

                                  return (
                                    <button
                                      key={`${slot.startAt}-${slot.endAt}`}
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`rounded-2xl px-3 py-3 text-left text-xs font-black transition ring-1 ${
                                        isSelected
                                          ? 'bg-white text-[#2b2118] ring-white'
                                          : 'bg-white/10 text-white ring-white/10 hover:bg-white/15'
                                      }`}
                                    >
                                      <span className="block">
                                        {formatTimeRange(slot.startAt, slot.endAt)}
                                      </span>
                                      <span className="mt-1 block text-[10px] opacity-70">
                                        {slot.slotDurationMinutes} dk
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={createBooking}
                      disabled={!selectedSlot || bookingLoading}
                      className="mt-4 w-full rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {bookingLoading
                        ? 'Randevu oluşturuluyor...'
                        : selectedSlot
                          ? `Randevu Oluştur • ${formatCompactDate(selectedSlot.startAt)}`
                          : 'Randevu için slot seç'}
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-[#2b2118]">
                  Uzman Müsaitliği
                </h3>

                <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                  Aktif müsaitlik aralıkları booking engine tarafından slotlara dönüştürülür.
                </p>

                <div className="mt-4 space-y-2">
                  {activeAvailability.length === 0 ? (
                    <p className="rounded-2xl bg-[#faf7f2] p-4 text-sm font-bold text-[#6b5c4d] ring-1 ring-black/5">
                      Aktif müsaitlik bulunamadı.
                    </p>
                  ) : (
                    activeAvailability.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-[#faf7f2] p-3 text-xs font-bold text-[#6b5c4d] ring-1 ring-black/5"
                      >
                        <p className="font-black text-[#2b2118]">
                          {getDayName(item.day_of_week)} • {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)}
                        </p>
                        <p className="mt-1">
                          {item.slot_duration_minutes} dk seans + {item.buffer_minutes} dk buffer
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 shadow-sm">
                <h3 className="text-lg font-black text-red-800">
                  Moderasyon Özeti
                </h3>

                <p className="mt-2 text-sm font-semibold text-red-700">
                  Flagged mesajlar platform dışı kaçış veya ödeme bypass
                  girişimi olabilir.
                </p>

                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-red-100">
                  <p className="text-sm font-black text-red-800">
                    Flagged Mesaj Sayısı
                  </p>
                  <p className="mt-2 text-3xl font-black text-red-700">
                    {flaggedMessages.length}
                  </p>
                </div>

                {flaggedMessages.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {flaggedMessages.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-white p-3 text-xs font-semibold text-red-900 ring-1 ring-red-100"
                      >
                        <p className="font-black">
                          {getSenderLabel(item.sender_type)} •{' '}
                          {item.flag_reason || 'contact_leak'}
                        </p>
                        <p className="mt-2 line-clamp-3">{item.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
                <h3 className="text-lg font-black text-[#2b2118]">
                  Sistem Kuralları
                </h3>

                <div className="mt-4 space-y-3 text-sm font-semibold text-[#6b5c4d]">
                  <p>✅ Admin her zaman mesaj gönderebilir.</p>
                  <p>🔒 Danışan/uzman mesajı için ödeme paid olmalı.</p>
                  <p>📅 Randevu slotları uzman müsaitliğinden üretilir.</p>
                  <p>🧱 Aynı uzman için çakışan booking engellenir.</p>
                  <p>🔁 Randevu lifecycle: planlandı → onaylandı → aktif → tamamlandı.</p>
                  <p>🎥 Görüşmeye hazırla butonu booking’i live session akışına bağlar.</p>
                  <p>
                    🚨 Telefon, e-posta, WhatsApp, Instagram, Telegram, IBAN
                    flaglenir.
                  </p>
                  <p>
                    ⚡ Realtime aktifse yeni mesajlar refresh yapmadan düşer.
                  </p>
                  <p>
                    🟢 Presence ile online/offline durumu anlık takip edilir.
                  </p>
                </div>
              </div>

              {conversation && (
                <div className="rounded-[2rem] border border-[#e5d9cc] bg-white p-5 shadow-sm">
                  <h3 className="text-lg font-black text-[#2b2118]">
                    Teknik Bilgi
                  </h3>

                  <div className="mt-4 space-y-2 text-xs font-semibold text-[#6b5c4d]">
                    <p className="break-all">
                      <b>Client Application:</b>{' '}
                      {conversation.client_application_id || '-'}
                    </p>
                    <p className="break-all">
                      <b>Expert:</b> {conversation.expert_id || '-'}
                    </p>
                    <p>
                      <b>Oluşturuldu:</b> {formatDate(conversation.created_at)}
                    </p>
                    <p>
                      <b>Güncellendi:</b> {formatDate(conversation.updated_at)}
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  )
}


function UpcomingSessionCard({
  booking,
  bookings,
  loading,
  error,
  conversationId,
  actionLoadingId,
  prepareLoadingId,
  sendLinksLoadingId,
  actionError,
  actionSuccess,
  onRefresh,
  onStatusChange,
  onPrepareSession,
  onSendLinks,
}: {
  booking: Booking | null
  bookings: Booking[]
  loading: boolean
  error: string
  conversationId: string
  actionLoadingId: string
  prepareLoadingId: string
  sendLinksLoadingId: string
  actionError: string
  actionSuccess: string
  onRefresh: () => void
  onStatusChange: (booking: Booking, status: BookingStatus) => void
  onPrepareSession: (booking: Booking) => void
  onSendLinks: (booking: Booking) => void
}) {
  const timingState = getSessionTimingState(booking)

  return (
    <div className="rounded-[2rem] border border-[#d8c8b8] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#8a7662]">
            Scheduled Session
          </p>
          <h3 className="mt-2 text-xl font-black text-[#2b2118]">
            Yaklaşan Seans
          </h3>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="rounded-full bg-[#faf7f2] px-4 py-2 text-xs font-black text-[#6b5c4d] ring-1 ring-black/5 transition hover:bg-[#f3eadf] disabled:opacity-50"
        >
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="mt-5 rounded-2xl bg-[#faf7f2] p-4 text-sm font-bold text-[#6b5c4d] ring-1 ring-black/5">
          Randevular yükleniyor...
        </div>
      ) : error ? (
        <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
          {error}
        </div>
      ) : !booking ? (
        <div className="mt-5 rounded-2xl bg-[#faf7f2] p-4 text-sm font-bold text-[#6b5c4d] ring-1 ring-black/5">
          Bu konuşma için yaklaşan randevu yok.
        </div>
      ) : (
        <div className="mt-5 rounded-3xl bg-[#2b2118] p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[#c9b8a7]">
                {formatCompactDate(booking.scheduled_start_at)}
              </p>
              <h4 className="mt-2 text-2xl font-black">
                {formatTimeRange(
                  booking.scheduled_start_at,
                  booking.scheduled_end_at
                )}
              </h4>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getBookingStatusClass(
                booking.status
              )}`}
            >
              {getBookingStatusLabel(booking.status)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniSessionMetric label="Timezone" value={booking.timezone || DEFAULT_TIMEZONE} />
            <MiniSessionMetric
              label="Durum"
              value={
                timingState === 'joinable'
                  ? 'Katılabilir'
                  : timingState === 'upcoming'
                    ? 'Yaklaşan'
                    : timingState === 'expired'
                      ? 'Süresi geçti'
                      : timingState === 'completed'
                        ? 'Tamamlandı'
                        : 'Kapalı'
              }
            />
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 text-xs font-bold text-[#e7d8c8]">
            Booking ID: <span className="break-all">{booking.id}</span>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-xs font-bold text-[#e7d8c8]">
            <div className="flex items-center justify-between gap-3">
              <span>Video Session</span>
              <span className={booking.session_ready ? 'text-emerald-200' : 'text-yellow-100'}>
                {booking.session_ready ? 'Hazır' : 'Hazır değil'}
              </span>
            </div>
            {booking.live_session_id && (
              <p className="mt-2 break-all opacity-80">
                Session ID: {booking.live_session_id}
              </p>
            )}
            {booking.session_ready_at && (
              <p className="mt-1 opacity-80">
                Hazırlanma: {formatDate(booking.session_ready_at)}
              </p>
            )}
          </div>

          {booking.session_ready && (
            <div className="mt-3 space-y-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-50">
              <p className="font-black">Join Linkleri</p>
              {booking.client_join_url && (
                <a
                  href={booking.client_join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate underline underline-offset-4"
                >
                  Danışan linki
                </a>
              )}
              {booking.expert_join_url && (
                <a
                  href={booking.expert_join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate underline underline-offset-4"
                >
                  Uzman linki
                </a>
              )}
              {booking.admin_join_url && (
                <a
                  href={booking.admin_join_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate underline underline-offset-4"
                >
                  Admin akışı
                </a>
              )}
            </div>
          )}

          {actionError && (
            <div className="mt-4 rounded-2xl border border-red-300/20 bg-red-500/15 p-3 text-xs font-bold text-red-100">
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-500/15 p-3 text-xs font-bold text-emerald-100">
              {actionSuccess}
            </div>
          )}

          <BookingLifecycleActions
            booking={booking}
            timingState={timingState}
            loading={actionLoadingId === booking.id}
            prepareLoading={prepareLoadingId === booking.id}
            sendLinksLoading={sendLinksLoadingId === booking.id}
            onStatusChange={onStatusChange}
            onPrepareSession={onPrepareSession}
            onSendLinks={onSendLinks}
          />

          <Link
            href={`/admin/conversations/${conversationId}`}
            className="mt-3 block rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Chat Akışı
          </Link>
        </div>
      )}

      {bookings.length > 0 && (
        <div className="mt-5">
          <h4 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#8a7662]">
            Son Randevular
          </h4>

          <div className="space-y-2">
            {bookings.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-[#faf7f2] p-3 text-xs font-bold text-[#6b5c4d] ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-[#2b2118]">
                    {formatCompactDate(item.scheduled_start_at)}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ring-1 ${getBookingStatusClass(
                      item.status
                    )}`}
                  >
                    {getBookingStatusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-1">
                  {formatTimeRange(item.scheduled_start_at, item.scheduled_end_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


function BookingLifecycleActions({
  booking,
  timingState,
  loading,
  prepareLoading,
  sendLinksLoading,
  onStatusChange,
  onPrepareSession,
  onSendLinks,
}: {
  booking: Booking
  timingState: string
  loading: boolean
  prepareLoading: boolean
  sendLinksLoading: boolean
  onStatusChange: (booking: Booking, status: BookingStatus) => void
  onPrepareSession: (booking: Booking) => void
  onSendLinks: (booking: Booking) => void
}) {
  const isClosed =
    booking.status === 'completed' ||
    booking.status === 'cancelled' ||
    booking.status === 'no_show'

  if (isClosed) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 p-3 text-xs font-bold text-[#e7d8c8]">
        Bu randevu operasyonel olarak kapalı durumda.
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-2">
      <button
        type="button"
        disabled={prepareLoading || loading || Boolean(booking.session_ready)}
        onClick={() => onPrepareSession(booking)}
        className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#2b2118] transition hover:bg-[#f3eadf] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {prepareLoading
          ? 'Görüşme hazırlanıyor...'
          : booking.session_ready
            ? 'Görüşme Hazır'
            : 'Görüşmeye Hazırla'}
      </button>

      {booking.session_ready && (
        <button
          type="button"
          disabled={
            loading ||
            sendLinksLoading ||
            !booking.client_join_url ||
            !booking.expert_join_url
          }
          onClick={() => onSendLinks(booking)}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sendLinksLoading ? 'Mail gönderiliyor...' : 'Linkleri Mail Gönder'}
        </button>
      )}

      {booking.status === 'scheduled' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => onStatusChange(booking, 'confirmed')}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#2b2118] transition hover:bg-[#f3eadf] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Güncelleniyor...' : 'Randevuyu Onayla'}
        </button>
      )}

      {(booking.status === 'scheduled' || booking.status === 'confirmed') && (
        <button
          type="button"
          disabled={loading}
          onClick={() => onStatusChange(booking, 'active')}
          className="w-full rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {timingState === 'joinable'
            ? 'Görüşmeyi Aktif Başlat'
            : 'Manuel Aktif Başlat'}
        </button>
      )}

      {booking.status === 'active' && (
        <button
          type="button"
          disabled={loading}
          onClick={() => onStatusChange(booking, 'completed')}
          className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Seansı Tamamlandı Yap
        </button>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => onStatusChange(booking, 'cancelled')}
          className="rounded-2xl border border-red-300/20 bg-red-500/15 px-4 py-3 text-xs font-black text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          İptal Et
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => onStatusChange(booking, 'no_show')}
          className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-black text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Katılmadı
        </button>
      </div>
    </div>
  )
}


function MiniSessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#c9b8a7]">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}


function StatusPill({
  active,
  activeText,
  inactiveText,
  tone = 'emerald',
}: {
  active: boolean
  activeText: string
  inactiveText: string
  tone?: 'emerald' | 'blue'
}) {
  const activeClass =
    tone === 'blue'
      ? 'bg-blue-50 text-blue-700 ring-blue-100'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-100'

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
        active ? activeClass : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
      }`}
    >
      {active ? activeText : inactiveText}
    </span>
  )
}

function MetricCard({
  title,
  value,
  valueClassName = 'text-[#2b2118]',
  variant = 'default',
}: {
  title: string
  value: string
  valueClassName?: string
  variant?: 'default' | 'danger'
}) {
  const danger = variant === 'danger'

  return (
    <div
      className={`rounded-2xl p-4 ring-1 ${
        danger ? 'bg-red-50 ring-red-100' : 'bg-[#faf7f2] ring-black/5'
      }`}
    >
      <p
        className={`text-xs font-black uppercase tracking-[0.2em] ${
          danger ? 'text-red-700' : 'text-[#8a7662]'
        }`}
      >
        {title}
      </p>
      <p
        className={`mt-2 text-xl font-black ${
          danger ? 'text-red-700' : valueClassName
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function groupSlotsByDate(slots: Slot[]) {
  return slots.reduce<Record<string, Slot[]>>((groups, slot) => {
    const label = new Intl.DateTimeFormat('tr-TR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    }).format(new Date(slot.startAt))

    if (!groups[label]) groups[label] = []
    groups[label].push(slot)

    return groups
  }, {})
}

function formatTimeRange(startAt: string, endAt: string) {
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${formatter.format(new Date(startAt))} - ${formatter.format(
    new Date(endAt)
  )}`
}
