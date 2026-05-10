import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type UserType = 'client' | 'expert'
type AttachmentKind = 'image' | 'document' | 'audio' | 'file'

type AttachmentRow = {
  id: string
  conversation_id: string
  message_id: string | null
  uploaded_by_type: UserType
  file_name: string
  file_path: string
  mime_type: string
  file_size: number
  created_at: string
}

type DbError = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

type AttachmentDb = {
  from: (table: 'conversation_attachments') => {
    insert: (values: {
      id: string
      conversation_id: string
      uploaded_by_type: UserType
      file_name: string
      file_path: string
      mime_type: string
      file_size: number
    }) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: AttachmentRow | null
          error: DbError | null
        }>
      }
    }
  }
}

const BUCKET_NAME = 'chat-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set<string>([
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

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',

  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',

  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
}

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  )
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120)

  return cleaned || 'attachment'
}

function isValidUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'expert'
}

function getExtensionFromMime(mimeType: string) {
  return EXTENSION_BY_MIME[mimeType] ?? 'bin'
}

function getAttachmentKind(mimeType: string): AttachmentKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'

  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document'
  }

  return 'file'
}

function buildStoragePath({
  conversationId,
  userType,
  attachmentId,
  mimeType,
}: {
  conversationId: string
  userType: UserType
  attachmentId: string
  mimeType: string
}) {
  const kind = getAttachmentKind(mimeType)
  const extension = getExtensionFromMime(mimeType)

  return [
    'conversations',
    conversationId,
    userType,
    kind,
    `${attachmentId}-${Date.now()}.${extension}`,
  ].join('/')
}

function toAttachmentDb(client: unknown): AttachmentDb {
  return client as AttachmentDb
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let uploadedFilePath: string | null = null

  try {
    const { id: conversationId } = await params

    if (!conversationId) {
      return jsonError('Conversation ID eksik.', 400)
    }

    const token = req.nextUrl.searchParams.get('token')
    const roleParam = req.nextUrl.searchParams.get('role')

    if (!token) {
      return jsonError('Erişim tokenı eksik.', 401)
    }

    if (!isValidUserType(roleParam)) {
      return jsonError('Geçersiz veya eksik kullanıcı tipi.', 400)
    }

    const userType = roleParam

    const accessResult = await verifyConversationAccessToken({
      conversationId,
      token,
      role: userType,
    })

    if (!accessResult?.ok) {
      return jsonError('Bu görüşmeye erişim yetkiniz yok.', 403)
    }

    const contentLengthHeader = req.headers.get('content-length')
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null

    if (
      contentLength !== null &&
      Number.isFinite(contentLength) &&
      contentLength > MAX_FILE_SIZE + 1024 * 1024
    ) {
      return jsonError('Yükleme boyutu çok büyük.', 413)
    }

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return jsonError('Dosya bulunamadı.', 400)
    }

    if (!file.name) {
      return jsonError('Dosya adı geçersiz.', 400)
    }

    if (!file.type || !ALLOWED_MIME_TYPES.has(file.type)) {
      return jsonError(
        'Bu dosya türü desteklenmiyor. Sadece görsel, PDF, DOC, DOCX ve ses dosyaları yüklenebilir.',
        415
      )
    }

    if (file.size <= 0) {
      return jsonError('Boş dosya yüklenemez.', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError('Dosya boyutu 10 MB sınırını aşamaz.', 413)
    }

    const supabase = getSupabaseAdmin()
    const attachmentDb = toAttachmentDb(supabase)

    const attachmentId = randomUUID()
    const safeOriginalName = sanitizeFileName(file.name)

    const filePath = buildStoragePath({
      conversationId,
      userType,
      attachmentId,
      mimeType: file.type,
    })

    uploadedFilePath = filePath

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Attachment upload error:', uploadError)
      return jsonError('Dosya yüklenirken bir hata oluştu.', 500)
    }

    const { data: attachment, error: insertError } = await attachmentDb
      .from('conversation_attachments')
      .insert({
        id: attachmentId,
        conversation_id: conversationId,
        uploaded_by_type: userType,
        file_name: safeOriginalName,
        file_path: filePath,
        mime_type: file.type,
        file_size: file.size,
      })
      .select(
        `
          id,
          conversation_id,
          message_id,
          uploaded_by_type,
          file_name,
          file_path,
          mime_type,
          file_size,
          created_at
        `
      )
      .single()

    if (insertError || !attachment) {
      console.error('Attachment metadata insert error:', insertError)

      await supabase.storage.from(BUCKET_NAME).remove([filePath])

      return jsonError('Dosya kaydı oluşturulurken bir hata oluştu.', 500)
    }

    uploadedFilePath = null

    return NextResponse.json(
      {
        ok: true,
        attachment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected attachment upload error:', error)

    if (uploadedFilePath) {
      try {
        const supabase = getSupabaseAdmin()
        await supabase.storage.from(BUCKET_NAME).remove([uploadedFilePath])
      } catch (cleanupError) {
        console.error('Attachment cleanup error:', cleanupError)
      }
    }

    return jsonError('Beklenmeyen bir hata oluştu.', 500)
  }
}