'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import { createMindoraRealtimeClient } from '@/lib/supabase/realtime'

type UserType = 'client' | 'expert' | 'admin'

type Attachment = {
  id: string
  conversation_id: string
  message_id: string | null
  uploaded_by_type: 'client' | 'expert'
  file_name: string
  mime_type: string
  file_size: number
  created_at: string
}

type Conversation = {
  id: string
  status: 'locked' | 'active' | 'closed'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  conversation_id: string
  sender_type: UserType
  sender_name: string | null
  message: string
  is_flagged: boolean
  flag_reason: string | null
  created_at: string
  attachments?: Attachment[]
}

type TypingPayload = {
  senderType: UserType
  senderName: string
  isTyping: boolean
}

type PresenceMeta = {
  userType?: UserType
  userName?: string
  onlineAt?: string
  conversationId?: string
}

type OnlineUsers = {
  expert: boolean
  admin: boolean
}

type ReadState = Record<UserType, string | null>

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const MAX_RECORDING_SECONDS = 180

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
])

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

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return '-'
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function getSenderName(message: Message) {
  if (message.sender_type === 'client') return 'Siz'
  if (message.sender_type === 'expert') return 'Uzman'
  return 'Mindora'
}

function getPaymentText(status?: string) {
  if (status === 'paid') return 'Ödeme tamamlandı'
  if (status === 'pending') return 'Ödeme bekleniyor'
  if (status === 'failed') return 'Ödeme başarısız'
  if (status === 'refunded') return 'Ödeme iade edildi'
  return '-'
}

function getTypingText(senderType: UserType) {
  if (senderType === 'expert') return 'Uzman yazıyor...'
  if (senderType === 'admin') return 'Mindora yazıyor...'
  return 'Danışan yazıyor...'
}

function isAfter(readAt?: string | null, messageAt?: string | null) {
  if (!readAt || !messageAt) return false
  return new Date(readAt).getTime() > new Date(messageAt).getTime()
}

function getMessageStatus(item: Message, reads: ReadState) {
  if (item.sender_type !== 'client') return null

  const expertSeen = isAfter(reads.expert, item.created_at)
  const adminSeen = isAfter(reads.admin, item.created_at)

  if (expertSeen) return 'Görüldü'
  if (adminSeen) return 'Mindora gördü'

  return 'Gönderildi'
}

function getFileIcon(fileType?: string) {
  if (!fileType) return '📎'
  if (fileType.startsWith('audio/')) return '🎤'
  if (fileType.startsWith('image/')) return '🖼️'
  if (fileType === 'application/pdf') return '📄'
  if (fileType.includes('wordprocessingml') || fileType === 'application/msword') {
    return '📝'
  }
  return '📎'
}

function getCleanMessageText(item: Message) {
  const attachmentNames = item.attachments?.map((attachment) => attachment.file_name) || []
  let text = item.message || ''

  attachmentNames.forEach((fileName) => {
    const attachment = item.attachments?.find((a) => a.file_name === fileName)
    text = text
      .replace(
        `\n\n📎 ${fileName} (${formatFileSize(attachment?.file_size || 0)})`,
        ''
      )
      .replace(`📎 Dosya paylaşıldı: ${fileName}`, '')
      .replace(`🎤 Sesli mesaj: ${fileName}`, '')
      .replace(`🎤 Sesli mesaj gönderildi`, '')
      .trim()
  })

  return text
}

function getBestAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm'

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]

  return (
    candidates.find((type) => MediaRecorder.isTypeSupported(type)) ||
    'audio/webm'
  )
}

export default function ClientChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const {
    showToast,
    requestNotificationPermission,
    notificationPermission,
    notificationsSupported,
    notificationsEnabled,
  } = useToast()

  const searchParams = useSearchParams()
  const router = useRouter()

  const [conversationId, setConversationId] = useState('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [accessLoading, setAccessLoading] = useState(true)
  const [accessVerified, setAccessVerified] = useState(false)
  const [realtimeReady, setRealtimeReady] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null)
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null)
  const [signedAudioUrls, setSignedAudioUrls] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [blockedError, setBlockedError] = useState('')
  const [typingUser, setTypingUser] = useState<TypingPayload | null>(null)
  const [readSynced, setReadSynced] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [videoSessionLoading, setVideoSessionLoading] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)

  const [reads, setReads] = useState<ReadState>({
    client: null,
    expert: null,
    admin: null,
  })

  const [onlineUsers, setOnlineUsers] = useState<OnlineUsers>({
    expert: false,
    admin: false,
  })

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const localTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>['channel']
  > | null>(null)

  const isActive =
    conversation?.status === 'active' && conversation?.payment_status === 'paid'

  const notificationStatusText = !notificationsSupported
    ? 'Bildirim desteklenmiyor'
    : notificationsEnabled
      ? 'Bildirim açık'
      : notificationPermission === 'denied'
        ? 'Bildirim engelli'
        : 'Bildirim kapalı'

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    })
  }

  function getAccessToken() {
    return searchParams.get('token') || ''
  }

  function getEncodedAccessToken() {
    return encodeURIComponent(getAccessToken())
  }

  function getMessagesUrl(id: string) {
    return `/api/conversations/${id}/messages?role=client&token=${getEncodedAccessToken()}`
  }

  function getReadsUrl(id: string) {
    return `/api/conversations/${id}/reads?role=client&token=${getEncodedAccessToken()}`
  }

  function getAttachmentUploadUrl(id: string) {
    return `/api/conversations/${id}/attachments/upload?role=client&token=${getEncodedAccessToken()}`
  }

  function getAttachmentSignedUrl(id: string, attachmentId: string) {
    return `/api/conversations/${id}/attachments/${attachmentId}/signed-url?role=client&token=${getEncodedAccessToken()}`
  }

  function hasValidAccessToken() {
    return getAccessToken().trim().length > 0
  }

  function stopRecordingStream() {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  function clearSelectedAttachment() {
    setSelectedAttachment(null)

    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl)
      setAudioPreviewUrl(null)
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function validateAttachment(file: File) {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return 'Bu dosya türü desteklenmiyor. Sadece görsel, PDF, DOC, DOCX ve ses dosyaları yüklenebilir.'
    }

    if (file.size <= 0) {
      return 'Boş dosya yüklenemez.'
    }

    if (file.size > MAX_ATTACHMENT_SIZE) {
      return 'Dosya boyutu 10 MB sınırını aşamaz.'
    }

    return ''
  }

  function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null

    if (!file) {
      setSelectedAttachment(null)
      return
    }

    const validationError = validateAttachment(file)

    if (validationError) {
      clearSelectedAttachment()
      setBlockedError(validationError)
      showToast('Dosya seçilemedi', validationError, 'warning')
      return
    }

    clearSelectedAttachment()
    setBlockedError('')
    setSelectedAttachment(file)
  }

  async function getSignedAttachmentUrl(attachment: Attachment) {
    if (!conversationId) return ''

    const res = await fetch(getAttachmentSignedUrl(conversationId, attachment.id), {
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data?.ok || !data?.signedUrl) {
      throw new Error(data?.error || 'Güvenli dosya bağlantısı oluşturulamadı.')
    }

    return String(data.signedUrl)
  }

  async function openAttachment(attachment: Attachment) {
    if (!conversationId) return

    if (!accessVerified || !hasValidAccessToken()) {
      showToast('Erişim doğrulanamadı', 'Dosya açmak için güvenli erişim gerekir.', 'error')
      return
    }

    try {
      setOpeningAttachmentId(attachment.id)

      const signedUrl = await getSignedAttachmentUrl(attachment)

      if (attachment.mime_type.startsWith('audio/')) {
        setSignedAudioUrls((current) => ({
          ...current,
          [attachment.id]: signedUrl,
        }))
        return
      }

      window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('CLIENT ATTACHMENT OPEN ERROR:', err)
      showToast(
        'Dosya açılamadı',
        err instanceof Error ? err.message : 'Dosya açılırken hata oluştu.',
        'error'
      )
    } finally {
      setOpeningAttachmentId(null)
    }
  }

  async function startVoiceRecording() {
    if (!isActive || !accessVerified || sending || uploadingAttachment) return

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      showToast('Mikrofon desteklenmiyor', 'Bu tarayıcı ses kaydını desteklemiyor.', 'warning')
      return
    }

    if (selectedAttachment) {
      showToast(
        'Dosya zaten seçili',
        'Ses kaydı almak için önce seçili dosyayı kaldırın.',
        'warning'
      )
      return
    }

    try {
      setBlockedError('')
      setRecordingSeconds(0)
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream

      const mimeType = getBestAudioMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })

      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(audioChunksRef.current, { type })

        stopRecordingTimer()
        stopRecordingStream()
        setIsRecording(false)

        if (!blob.size) {
          showToast('Ses kaydı oluşturulamadı', 'Boş ses kaydı gönderilemez.', 'warning')
          return
        }

        if (blob.size > MAX_ATTACHMENT_SIZE) {
          showToast('Ses kaydı çok büyük', 'Ses kaydı 10 MB sınırını aşamaz.', 'warning')
          return
        }

        const extension = type.includes('mp4') ? 'mp4' : 'webm'
        const file = new File(
          [blob],
          `mindora-sesli-mesaj-${Date.now()}.${extension}`,
          { type }
        )

        const previewUrl = URL.createObjectURL(blob)
        setAudioPreviewUrl(previewUrl)
        setSelectedAttachment(file)
      }

      recorder.start()
      setIsRecording(true)

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((current) => {
          const next = current + 1

          if (next >= MAX_RECORDING_SECONDS) {
            stopVoiceRecording()
          }

          return next
        })
      }, 1000)
    } catch (err) {
      console.error('CLIENT VOICE RECORDING START ERROR:', err)
      stopRecordingTimer()
      stopRecordingStream()
      setIsRecording(false)

      showToast(
        'Mikrofon izni alınamadı',
        'Sesli mesaj göndermek için mikrofon izni vermeniz gerekir.',
        'error'
      )
    }
  }

  function stopVoiceRecording() {
    const recorder = mediaRecorderRef.current

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }

    mediaRecorderRef.current = null
    stopRecordingTimer()
  }

  function cancelVoiceRecording() {
    const recorder = mediaRecorderRef.current

    audioChunksRef.current = []

    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
    }

    mediaRecorderRef.current = null
    stopRecordingTimer()
    stopRecordingStream()
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  async function uploadSelectedAttachment(id: string) {
    if (!selectedAttachment) return null

    const validationError = validateAttachment(selectedAttachment)

    if (validationError) {
      setBlockedError(validationError)
      showToast('Dosya yüklenemedi', validationError, 'warning')
      return null
    }

    const formData = new FormData()
    formData.append('file', selectedAttachment)

    setUploadingAttachment(true)

    try {
      const res = await fetch(getAttachmentUploadUrl(id), {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok || !data?.attachment) {
        const errorMessage = data?.error || 'Dosya yüklenemedi.'
        setBlockedError(errorMessage)
        showToast('Dosya yüklenemedi', errorMessage, 'error')
        return null
      }

      return data.attachment as Attachment
    } catch (err) {
      console.error('CLIENT ATTACHMENT UPLOAD ERROR:', err)
      setBlockedError('Dosya yüklenirken hata oluştu.')
      showToast('Dosya yüklenemedi', 'Dosya yüklenirken hata oluştu.', 'error')
      return null
    } finally {
      setUploadingAttachment(false)
    }
  }

  async function handleEnableNotifications() {
    try {
      setNotificationLoading(true)

      const permission = await requestNotificationPermission()

      if (permission === 'granted') {
        showToast(
          'Bildirimler açıldı',
          'Yeni mesajlarda tarayıcı bildirimi alabileceksiniz.',
          'success'
        )
        return
      }

      if (permission === 'denied') {
        showToast(
          'Bildirim izni engelli',
          'Tarayıcı ayarlarından Mindora için bildirim iznini açabilirsiniz.',
          'warning'
        )
        return
      }

      if (permission === 'unsupported') {
        showToast(
          'Bildirim desteklenmiyor',
          'Bu tarayıcı browser notification özelliğini desteklemiyor.',
          'warning'
        )
        return
      }

      showToast(
        'Bildirim izni verilmedi',
        'İsterseniz daha sonra tekrar açabilirsiniz.',
        'info'
      )
    } catch {
      showToast(
        'Bildirim izni alınamadı',
        'Tarayıcı bildirim izni sırasında hata oluştu.',
        'error'
      )
    } finally {
      setNotificationLoading(false)
    }
  }


  async function handleStartVideoSession() {
    if (!conversationId) {
      showToast(
        'Video görüşme başlatılamadı',
        'Konuşma bilgisi henüz hazır değil.',
        'warning'
      )
      return
    }

    if (!isActive) {
      showToast(
        'Video görüşme başlatılamaz',
        'Video görüşme için chat aktif ve ödeme tamamlanmış olmalıdır.',
        'warning'
      )
      return
    }

    if (!accessVerified || !hasValidAccessToken()) {
      showToast(
        'Erişim doğrulanamadı',
        'Video görüşmeye katılmak için güvenli erişim gerekir.',
        'error'
      )
      return
    }

    try {
      setVideoSessionLoading(true)

      const res = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          conversationId,
          createdBy: 'client',
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok || !data?.session?.id) {
        throw new Error(data?.error || 'Video görüşme oluşturulamadı.')
      }

      showToast(
        data.reused ? 'Mevcut seansa yönlendiriliyorsunuz' : 'Video görüşme hazır',
        'Güvenli video görüşme odasına yönlendiriliyorsunuz.',
        'success'
      )

      router.push(`/client/session/${data.session.id}?token=${getEncodedAccessToken()}`)
    } catch (err) {
      console.error('CLIENT VIDEO SESSION START ERROR:', err)

      showToast(
        'Video görüşme başlatılamadı',
        err instanceof Error
          ? err.message
          : 'Video görüşme başlatılırken hata oluştu.',
        'error'
      )
    } finally {
      setVideoSessionLoading(false)
    }
  }

  async function verifyAccess(id: string) {
    try {
      setAccessLoading(true)
      setAccessVerified(false)
      setError('')

      const token = getAccessToken()

      if (!token) {
        setError(
          'Bu güvenli görüşmeye erişim için geçerli bir token gerekiyor. Link eksik veya bozulmuş olabilir.'
        )
        return false
      }

      const res = await fetch('/api/chat-access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          conversationId: id,
          role: 'client',
          token,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(
          data?.error ||
            'Bu güvenli görüşmeye erişim yetkiniz bulunmuyor. Link süresi dolmuş veya geçersiz olabilir.'
        )
        return false
      }

      setAccessVerified(true)
      return true
    } catch (err) {
      console.error('CLIENT ACCESS VERIFY ERROR:', err)
      setError('Erişim doğrulanırken hata oluştu.')
      return false
    } finally {
      setAccessLoading(false)
    }
  }

  async function loadReadState(id: string) {
    try {
      if (!id) return
      if (!accessVerified) return
      if (!hasValidAccessToken()) return

      const res = await fetch(getReadsUrl(id), {
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error(
          'CLIENT READ STATE ERROR:',
          data?.error || 'Read state could not be loaded'
        )
        return
      }

      if (data.reads) {
        setReads({
          client: data.reads.client || null,
          expert: data.reads.expert || null,
          admin: data.reads.admin || null,
        })
      }
    } catch (err) {
      console.error('CLIENT READ STATE ERROR:', err)
    }
  }

  async function markConversationAsRead(id: string) {
    try {
      if (!id) return
      if (!accessVerified) return
      if (!hasValidAccessToken()) return

      setReadSynced(false)

      const res = await fetch(`/api/conversations/${id}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          userType: 'client',
          token: getAccessToken(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        console.error('CLIENT READ SYNC ERROR:', data?.error || 'Read sync failed')
        return
      }

      await loadReadState(id)
      setReadSynced(true)
    } catch (err) {
      console.error('CLIENT READ SYNC ERROR:', err)
    }
  }

  async function loadMessages(id: string, showLoading = false) {
    try {
      if (!id) return
      if (!accessVerified) return
      if (!hasValidAccessToken()) return

      if (showLoading) setLoading(true)
      setError('')

      const res = await fetch(getMessagesUrl(id), {
        cache: 'no-store',
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Konuşma alınamadı.')
        return
      }

      setConversation(data.conversation)
      setMessages(data.messages || [])

      await markConversationAsRead(id)
    } catch {
      setError('Sunucuya bağlanırken hata oluştu.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  async function broadcastTyping(isTyping: boolean) {
    if (!channelRef.current) return
    if (!conversationId) return
    if (!accessVerified) return

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          senderType: 'client',
          senderName: 'Danışan',
          isTyping,
        } satisfies TypingPayload,
      })
    } catch (err) {
      console.error('CLIENT TYPING BROADCAST ERROR:', err)
    }
  }

  function handleMessageChange(value: string) {
    setMessage(value)

    if (!isActive || !accessVerified) return

    broadcastTyping(value.trim().length > 0)

    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current)
    }

    localTypingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false)
    }, 2500)
  }

  async function sendMessage() {
    const cleanMessage = message.trim()

    if (!cleanMessage && !selectedAttachment) return
    if (!conversationId) return

    if (!accessVerified || !hasValidAccessToken()) {
      setBlockedError('Bu görüşmeye erişim doğrulanamadı.')
      return
    }

    try {
      setSending(true)
      setBlockedError('')
      await broadcastTyping(false)

      const uploadedAttachment = selectedAttachment
        ? await uploadSelectedAttachment(conversationId)
        : null

      if (selectedAttachment && !uploadedAttachment) {
        return
      }

      const finalMessage =
        cleanMessage ||
        (uploadedAttachment?.mime_type.startsWith('audio/')
          ? '🎤 Sesli mesaj gönderildi'
          : uploadedAttachment
            ? `📎 Dosya paylaşıldı: ${uploadedAttachment.file_name}`
            : '')

      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          senderType: 'client',
          senderName: 'Danışan',
          message: finalMessage,
          attachmentId: uploadedAttachment?.id || null,
          role: 'client',
          token: getAccessToken(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setBlockedError(data?.error || 'Mesaj gönderilemedi.')
        await loadMessages(conversationId, false)
        return
      }

      setMessage('')
      clearSelectedAttachment()

      if (uploadedAttachment) {
        showToast(
          uploadedAttachment.mime_type.startsWith('audio/')
            ? 'Sesli mesaj gönderildi'
            : 'Dosya yüklendi',
          uploadedAttachment.mime_type.startsWith('audio/')
            ? 'Sesli mesaj güvenli şekilde görüşmeye eklendi.'
            : 'Dosya güvenli şekilde görüşmeye eklendi.',
          'success'
        )
      }

      await loadMessages(conversationId, false)
    } catch {
      setBlockedError('Mesaj gönderilirken hata oluştu.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      const resolved = await params
      const id = resolved.id

      if (cancelled) return

      setConversationId(id)

      const verified = await verifyAccess(id)

      if (cancelled) return

      if (!verified) {
        setLoading(false)
        return
      }

      await loadMessages(id, true)
    }

    init()

    return () => {
      cancelled = true
    }
  }, [params, searchParams])

  useEffect(() => {
    scrollToBottom()
  }, [messages, typingUser])

  useEffect(() => {
    return () => {
      stopRecordingTimer()
      stopRecordingStream()

      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl)
      }
    }
  }, [audioPreviewUrl])

  useEffect(() => {
    if (!conversationId) return
    if (!accessVerified) return

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
              key: `client-${conversationId}`,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          if (!isMounted) return

          const presenceState = channel.presenceState()
          let expertOnline = false
          let adminOnline = false

          Object.values(presenceState).forEach((presences) => {
            presences.forEach((presence) => {
              const meta = presence as PresenceMeta

              if (meta.userType === 'expert') expertOnline = true
              if (meta.userType === 'admin') adminOnline = true
            })
          })

          setOnlineUsers({
            expert: expertOnline,
            admin: adminOnline,
          })
        })
        .on(
          'broadcast',
          { event: 'typing' },
          ({ payload }: { payload: TypingPayload }) => {
            if (!isMounted) return
            if (!payload) return
            if (payload.senderType === 'client') return

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
          async (payload) => {
            if (!isMounted) return

            const newMessage = payload.new as Message

            setTypingUser(null)

            if (newMessage.sender_type !== 'client') {
              const title =
                newMessage.sender_type === 'expert'
                  ? 'Uzmandan yeni mesaj'
                  : 'Mindora’dan yeni mesaj'

              const description = 'Güvenli görüşmede yeni bir mesaj var.'

              showToast(title, description, 'info', {
                browserNotification: true,
                notificationTitle: title,
                notificationBody: description,
              })
            }

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
            table: 'conversation_reads',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async () => {
            if (!isMounted) return
            await loadReadState(conversationId)
          }
        )
        .subscribe(async (status) => {
          if (!isMounted) return

          if (status === 'SUBSCRIBED') {
            setRealtimeReady(true)

            await channel.track({
              userType: 'client',
              userName: 'Danışan',
              onlineAt: new Date().toISOString(),
              conversationId,
            } satisfies PresenceMeta)

            await loadReadState(conversationId)
          }

          if (
            status === 'CHANNEL_ERROR' ||
            status === 'TIMED_OUT' ||
            status === 'CLOSED'
          ) {
            setRealtimeReady(false)
            setOnlineUsers({
              expert: false,
              admin: false,
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
          expert: false,
          admin: false,
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
      console.error('CLIENT REALTIME ERROR:', err)
      setRealtimeReady(false)
      setOnlineUsers({
        expert: false,
        admin: false,
      })
    }
  }, [conversationId, accessVerified, showToast])

  return (
    <main className="min-h-screen bg-[#f7f3ee] px-4 py-6 text-[#171717] md:px-6 md:py-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 rounded-[2rem] border border-[#e5d9cc] bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#8a7662]">
                Mindora Güvenli Görüşme
              </p>

              <h1 className="mt-2 text-2xl font-black text-[#2b2118] md:text-3xl">
                Danışan Chat Alanı
              </h1>

              <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                Uzmanınızla iletişim yalnızca Mindora üzerinden yürütülür.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    accessVerified
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-orange-50 text-orange-700 ring-orange-100'
                  }`}
                >
                  Erişim: {accessVerified ? 'Doğrulandı' : 'Kontrol ediliyor'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    realtimeReady
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                      : 'bg-orange-50 text-orange-700 ring-1 ring-orange-100'
                  }`}
                >
                  Realtime: {realtimeReady ? 'Aktif' : 'Bağlanıyor'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    onlineUsers.expert
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {onlineUsers.expert ? 'Uzman çevrimiçi' : 'Uzman çevrimdışı'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    onlineUsers.admin
                      ? 'bg-purple-50 text-purple-700 ring-purple-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {onlineUsers.admin ? 'Mindora aktif' : 'Mindora çevrimdışı'}
                </span>

                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700 ring-1 ring-purple-100">
                  Secure Token Aktif
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    readSynced
                      ? 'bg-blue-50 text-blue-700 ring-blue-100'
                      : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {readSynced ? 'Okundu senkron' : 'Okundu bekliyor'}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                    notificationsEnabled
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : notificationPermission === 'denied'
                        ? 'bg-red-50 text-red-700 ring-red-100'
                        : 'bg-zinc-100 text-zinc-600 ring-zinc-200'
                  }`}
                >
                  {notificationStatusText}
                </span>
              </div>

              {notificationsSupported &&
                !notificationsEnabled &&
                notificationPermission !== 'denied' && (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={notificationLoading}
                    className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {notificationLoading
                      ? 'Bildirim izni alınıyor...'
                      : '🔔 Bildirimleri Aç'}
                  </button>
                )}

              {notificationPermission === 'denied' && (
                <p className="mt-3 max-w-xl text-xs font-semibold leading-5 text-red-600">
                  Bildirim izni tarayıcı tarafından engellenmiş. Bildirim almak
                  için tarayıcı site ayarlarından Mindora bildirim iznini açmanız
                  gerekir.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 md:items-end">
              <button
                type="button"
                onClick={handleStartVideoSession}
                disabled={!isActive || !accessVerified || videoSessionLoading}
                className="rounded-full bg-black px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {videoSessionLoading
                  ? 'Seans hazırlanıyor...'
                  : '🎥 Video Görüşmeye Katıl'}
              </button>

              <Link
                href="/"
                className="rounded-full border border-black/10 bg-white px-5 py-3 text-center text-sm font-black text-[#2b2118] transition hover:bg-[#f0e8df]"
              >
                Ana Sayfa
              </Link>
            </div>
          </div>

          {conversation && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Chat
                </p>
                <p className="mt-2 text-lg font-black text-[#2b2118]">
                  {conversation.status === 'active'
                    ? 'Aktif'
                    : conversation.status === 'locked'
                      ? 'Kilitli'
                      : 'Kapalı'}
                </p>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Ödeme
                </p>
                <p className="mt-2 text-lg font-black text-green-700">
                  {getPaymentText(conversation.payment_status)}
                </p>
              </div>

              <div className="rounded-2xl bg-[#faf7f2] p-4 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7662]">
                  Güvenlik
                </p>
                <p className="mt-2 text-lg font-black text-purple-700">
                  Token Korumalı
                </p>
              </div>
            </div>
          )}
        </header>

        {loading || accessLoading ? (
          <section className="rounded-[2rem] bg-white p-8 text-center shadow-sm ring-1 ring-black/5">
            <p className="font-bold text-[#6b5c4d]">
              Güvenli erişim doğrulanıyor...
            </p>
          </section>
        ) : error ? (
          <section className="rounded-[2rem] bg-red-50 p-8 text-center shadow-sm ring-1 ring-red-100">
            <p className="text-lg font-black text-red-700">Erişim reddedildi</p>
            <p className="mt-2 text-sm font-bold text-red-600">{error}</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-[#e5d9cc] bg-white shadow-sm">
            {!isActive && (
              <div className="border-b border-orange-100 bg-orange-50 p-5">
                <p className="text-lg font-black text-orange-800">
                  🔒 Chat şu anda kilitli
                </p>

                <p className="mt-2 text-sm font-semibold text-orange-700">
                  Platform içi mesajlaşma ödeme tamamlandıktan sonra aktif olur.
                </p>
              </div>
            )}

            <div className="flex h-[520px] flex-col overflow-y-auto bg-[#faf7f2] p-4 md:p-6">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-3xl bg-white p-6 text-center ring-1 ring-black/5">
                    <p className="text-lg font-black text-[#2b2118]">
                      Henüz mesaj yok
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#6b5c4d]">
                      Chat aktif olduğunda uzmanınızla güvenli şekilde buradan
                      mesajlaşabilirsiniz.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-auto space-y-4">
                  {messages.map((item) => {
                    const isMine = item.sender_type === 'client'
                    const isAdmin = item.sender_type === 'admin'
                    const messageStatus = getMessageStatus(item, reads)
                    const cleanMessageText = getCleanMessageText(item)
                    const attachments = item.attachments || []

                    return (
                      <div
                        key={item.id}
                        className={`flex ${
                          isMine ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[82%] rounded-2xl p-4 text-sm shadow-sm ${
                            isMine
                              ? 'bg-black text-white'
                              : isAdmin
                                ? 'bg-purple-50 text-purple-950 ring-1 ring-purple-100'
                                : 'bg-white text-[#2b2118] ring-1 ring-black/10'
                          }`}
                        >
                          <p className="mb-2 text-xs font-black uppercase tracking-[0.15em] opacity-70">
                            {getSenderName(item)}
                          </p>

                          {cleanMessageText && (
                            <p className="whitespace-pre-wrap break-words leading-6">
                              {cleanMessageText}
                            </p>
                          )}

                          {attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {attachments.map((attachment) => {
                                const audioUrl = signedAudioUrls[attachment.id]
                                const isAudio = attachment.mime_type.startsWith('audio/')

                                return (
                                  <div
                                    key={attachment.id}
                                    className={`rounded-2xl p-3 ring-1 ${
                                      isMine
                                        ? 'bg-white/10 ring-white/15'
                                        : 'bg-[#faf7f2] ring-black/5'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                                          isMine ? 'bg-white/15' : 'bg-white'
                                        }`}
                                      >
                                        {getFileIcon(attachment.mime_type)}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black">
                                          {isAudio ? 'Sesli mesaj' : attachment.file_name}
                                        </p>
                                        <p className="mt-1 text-[11px] font-bold opacity-70">
                                          {formatFileSize(attachment.file_size)} · Güvenli dosya
                                        </p>
                                      </div>
                                    </div>

                                    {isAudio && audioUrl && (
                                      <audio
                                        controls
                                        preload="metadata"
                                        src={audioUrl}
                                        className="mt-3 w-full"
                                      />
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => openAttachment(attachment)}
                                      disabled={openingAttachmentId === attachment.id}
                                      className={`mt-3 w-full rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                        isMine
                                          ? 'bg-white text-black hover:bg-white/90'
                                          : 'bg-black text-white hover:bg-[#2b2118]'
                                      }`}
                                    >
                                      {openingAttachmentId === attachment.id
                                        ? 'Açılıyor...'
                                        : isAudio
                                          ? audioUrl
                                            ? 'Bağlantıyı Yenile'
                                            : 'Sesli Mesajı Dinle'
                                          : attachment.mime_type.startsWith('image/')
                                            ? 'Görseli Aç'
                                            : 'Dosyayı Aç'}
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold opacity-70">
                            <span>{formatDate(item.created_at)}</span>

                            {messageStatus && (
                              <span
                                className={`font-black ${
                                  messageStatus === 'Görüldü'
                                    ? 'text-emerald-300'
                                    : 'text-white/70'
                                }`}
                              >
                                {messageStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {typingUser && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#6b5c4d] shadow-sm ring-1 ring-black/10">
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

            {blockedError && (
              <div className="border-t border-red-100 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">
                  {blockedError}
                </p>
              </div>
            )}

            <div className="border-t border-black/10 bg-white p-4">
              <div className="mb-3 rounded-2xl bg-[#faf7f2] p-3 text-xs font-semibold text-[#6b5c4d] ring-1 ring-black/5">
                Telefon, e-posta, WhatsApp, Instagram, Telegram, IBAN veya
                platform dışı ödeme bilgisi paylaşmayınız.
              </div>

              {isRecording && (
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black text-red-700">
                      🎙️ Ses kaydediliyor
                    </p>
                    <p className="mt-1 text-xs font-bold text-red-600">
                      Süre: {formatDuration(recordingSeconds)} / {formatDuration(MAX_RECORDING_SECONDS)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cancelVoiceRecording}
                      className="rounded-full bg-white px-4 py-2 text-xs font-black text-red-600 ring-1 ring-red-100 transition hover:bg-red-50"
                    >
                      İptal
                    </button>

                    <button
                      type="button"
                      onClick={stopVoiceRecording}
                      className="rounded-full bg-black px-4 py-2 text-xs font-black text-white transition hover:bg-[#2b2118]"
                    >
                      Kaydı Bitir
                    </button>
                  </div>
                </div>
              )}

              {selectedAttachment && (
                <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-dashed border-black/15 bg-[#faf7f2] p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl ring-1 ring-black/5">
                      {getFileIcon(selectedAttachment.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#2b2118]">
                        {selectedAttachment.type.startsWith('audio/')
                          ? 'Sesli mesaj hazır'
                          : selectedAttachment.name}
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#8a7662]">
                        {formatFileSize(selectedAttachment.size)} · Güvenli
                        yükleme için hazır
                      </p>

                      {audioPreviewUrl && (
                        <audio
                          controls
                          preload="metadata"
                          src={audioPreviewUrl}
                          className="mt-3 w-full"
                        />
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelectedAttachment}
                    disabled={sending || uploadingAttachment}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-red-600 ring-1 ring-red-100 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Kaldır
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row">
                <textarea
                  value={message}
                  onChange={(event) => handleMessageChange(event.target.value)}
                  disabled={!isActive || !accessVerified || sending || isRecording}
                  rows={3}
                  maxLength={2000}
                  placeholder={
                    isActive
                      ? 'Mesajınızı yazın...'
                      : 'Ödeme tamamlandıktan sonra mesajlaşma aktif olur.'
                  }
                  className="min-h-24 flex-1 resize-none rounded-2xl border border-black/10 bg-[#faf7f2] p-4 text-sm font-semibold text-[#2b2118] outline-none transition placeholder:text-[#9b8b7c] focus:border-black/30 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="flex gap-2 md:w-56 md:flex-col">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/webm,audio/mp4,audio/mpeg,audio/wav,audio/x-wav"
                    onChange={handleAttachmentChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isActive || !accessVerified || sending || isRecording}
                    className="flex-1 rounded-2xl border border-black/10 bg-white px-4 py-4 text-sm font-black text-[#2b2118] transition hover:bg-[#f0e8df] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    📎 Dosya
                  </button>

                  <button
                    type="button"
                    onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                    disabled={
                      !isActive ||
                      !accessVerified ||
                      sending ||
                      uploadingAttachment ||
                      Boolean(selectedAttachment && !isRecording)
                    }
                    className={`flex-1 rounded-2xl px-4 py-4 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      isRecording
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'border border-black/10 bg-white text-[#2b2118] hover:bg-[#f0e8df]'
                    }`}
                  >
                    {isRecording ? '⏹️ Bitir' : '🎤 Ses'}
                  </button>

                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={
                      !isActive ||
                      !accessVerified ||
                      sending ||
                      uploadingAttachment ||
                      isRecording ||
                      (!message.trim() && !selectedAttachment)
                    }
                    className="flex-1 rounded-2xl bg-black px-6 py-4 text-sm font-black text-white transition hover:bg-[#2b2118] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploadingAttachment
                      ? 'Yükleniyor...'
                      : sending
                        ? 'Gönderiliyor...'
                        : 'Gönder'}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1 text-xs font-semibold text-[#8a7662] md:flex-row md:items-center md:justify-between">
                <p>{message.length}/2000 karakter</p>
                <p>PDF, DOC, DOCX, görsel veya ses · Maksimum 10 MB</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}