import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

type UploadResult = {
  data: unknown | null
  error: { message?: string; code?: string; details?: string; hint?: string } | null
}

const BUCKET_NAME = 'chat-attachments'
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_CONTENT_LENGTH = MAX_FILE_SIZE + 1024 * 1024

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

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function isValidUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'expert'
}

function sanitizeFileName(fileName: string) {
  const cleaned = toText(fileName)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[_\s.]+|[_\s.]+$/g, '')
    .slice(0, 120)

  return cleaned || 'attachment'
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

function isAllowedMimeType(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_MIME_TYPES.has(value)
}

function isSafeContentLength(req: NextRequest) {
  const header = req.headers.get('content-length')
  if (!header) return true

  const contentLength = Number(header)

  return Number.isFinite(contentLength) && contentLength > 0 && contentLength <= MAX_CONTENT_LENGTH
}

async function removeUploadedFile(filePath: string | null) {
  if (!filePath) return

  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath])

    if (error) {
      console.error('ATTACHMENT_UPLOAD_CLEANUP_STORAGE_ERROR', {
        filePath,
        error,
      })
    }
  } catch (error) {
    console.error('ATTACHMENT_UPLOAD_CLEANUP_UNEXPECTED_ERROR', {
      filePath,
      error,
    })
  }
}

function normalizeAttachmentRow(value: unknown): AttachmentRow | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Partial<AttachmentRow>

  if (!row.id || !row.conversation_id || !row.file_name || !row.file_path) {
    return null
  }

  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    message_id: row.message_id ? String(row.message_id) : null,
    uploaded_by_type: row.uploaded_by_type === 'expert' ? 'expert' : 'client',
    file_name: String(row.file_name),
    file_path: String(row.file_path),
    mime_type: String(row.mime_type || ''),
    file_size: Number(row.file_size || 0),
    created_at: String(row.created_at || new Date().toISOString()),
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let uploadedFilePath: string | null = null

  try {
    const { id } = await params
    const conversationId = toText(id)

    if (!isValidUuid(conversationId)) {
      return jsonError('Geçerli conversation ID gerekli.', 400)
    }

    const token = toText(req.nextUrl.searchParams.get('token'))
    const roleParam = toText(req.nextUrl.searchParams.get('role'))

    if (!token) {
      return jsonError('Erişim tokenı eksik.', 401)
    }

    if (!isValidUserType(roleParam)) {
      return jsonError('Geçersiz veya eksik kullanıcı tipi.', 400)
    }

    if (!isSafeContentLength(req)) {
      return jsonError('Yükleme boyutu çok büyük.', 413)
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

    const formData = await req.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return jsonError('Dosya bulunamadı.', 400)
    }

    const originalName = sanitizeFileName(file.name)

    if (!originalName) {
      return jsonError('Dosya adı geçersiz.', 400)
    }

    if (!isAllowedMimeType(file.type)) {
      return jsonError(
        'Bu dosya türü desteklenmiyor. Sadece görsel, PDF, DOC, DOCX ve ses dosyaları yüklenebilir.',
        415
      )
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      return jsonError('Boş dosya yüklenemez.', 400)
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError('Dosya boyutu 10 MB sınırını aşamaz.', 413)
    }

    const supabase = getSupabaseAdmin()
    const db = supabase as any
    const attachmentId = randomUUID()

    const filePath = buildStoragePath({
      conversationId,
      userType,
      attachmentId,
      mimeType: file.type,
    })

    uploadedFilePath = filePath

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError }: UploadResult = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('ATTACHMENT_UPLOAD_STORAGE_ERROR', {
        conversationId,
        userType,
        fileName: originalName,
        mimeType: file.type,
        fileSize: file.size,
        error: uploadError,
      })

      return jsonError('Dosya yüklenirken bir hata oluştu.', 500)
    }

    const { data, error: insertError } = await db
      .from('conversation_attachments')
      .insert({
        id: attachmentId,
        conversation_id: conversationId,
        uploaded_by_type: userType,
        file_name: originalName,
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

    if (insertError) {
      console.error('ATTACHMENT_UPLOAD_METADATA_INSERT_ERROR', {
        conversationId,
        userType,
        fileName: originalName,
        mimeType: file.type,
        fileSize: file.size,
        error: insertError,
      })

      await removeUploadedFile(filePath)

      return jsonError('Dosya kaydı oluşturulurken bir hata oluştu.', 500)
    }

    const attachment = normalizeAttachmentRow(data)

    if (!attachment) {
      console.error('ATTACHMENT_UPLOAD_METADATA_INVALID_ROW', {
        conversationId,
        attachmentId,
        data,
      })

      await removeUploadedFile(filePath)

      return jsonError('Dosya kaydı doğrulanamadı.', 500)
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
    console.error('ATTACHMENT_UPLOAD_UNEXPECTED_ERROR', error)

    await removeUploadedFile(uploadedFilePath)

    return jsonError('Beklenmeyen bir hata oluştu.', 500)
  }
}
