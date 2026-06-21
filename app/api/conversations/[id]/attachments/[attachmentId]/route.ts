import { NextRequest, NextResponse } from 'next/server'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UserType = 'client' | 'expert'

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

const BUCKET_NAME = 'chat-attachments'
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
      value.trim()
    )
  )
}

function isValidUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'expert'
}

function normalizeAttachmentRow(value: unknown): AttachmentRow | null {
  if (!value || typeof value !== 'object') return null

  const row = value as Partial<AttachmentRow>

  if (
    !isValidUuid(row.id) ||
    !isValidUuid(row.conversation_id) ||
    !row.file_name ||
    !row.file_path
  ) {
    return null
  }

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    message_id: row.message_id && isValidUuid(row.message_id) ? row.message_id : null,
    uploaded_by_type: row.uploaded_by_type === 'expert' ? 'expert' : 'client',
    file_name: toText(row.file_name) || 'attachment',
    file_path: toText(row.file_path),
    mime_type: toText(row.mime_type) || 'application/octet-stream',
    file_size: Number(row.file_size || 0),
    created_at: toText(row.created_at) || new Date().toISOString(),
  }
}

function sanitizeDownloadName(value: string) {
  const cleaned = toText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^[_\s.]+|[_\s.]+$/g, '')
    .slice(0, 120)

  return cleaned || 'mindora-dosya'
}

function isSafeStoragePath(filePath: string, conversationId: string) {
  const normalized = toText(filePath)

  if (!normalized) return false
  if (normalized.startsWith('/')) return false
  if (normalized.includes('..')) return false
  if (normalized.includes('\\')) return false

  return normalized.startsWith(`conversations/${conversationId}/`)
}

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
      attachmentId: string
    }>
  }
) {
  try {
    const { id, attachmentId } = await params
    const conversationId = toText(id)
    const safeAttachmentId = toText(attachmentId)

    if (!isValidUuid(conversationId)) {
      return jsonError('Geçerli conversation ID gerekli.', 400)
    }

    if (!isValidUuid(safeAttachmentId)) {
      return jsonError('Geçerli attachment ID gerekli.', 400)
    }

    const token = toText(req.nextUrl.searchParams.get('token'))
    const roleParam = toText(req.nextUrl.searchParams.get('role'))

    if (!token) {
      return jsonError('Erişim tokenı eksik.', 401)
    }

    if (!isValidUserType(roleParam)) {
      return jsonError('Geçersiz veya eksik kullanıcı tipi.', 400)
    }

    const accessResult = await verifyConversationAccessToken({
      conversationId,
      token,
      role: roleParam,
    })

    if (!accessResult?.ok) {
      return jsonError('Bu görüşmeye erişim yetkiniz yok.', 403)
    }

    const supabase = getSupabaseAdmin()
    const db = supabase as any

    const { data, error: attachmentError } = await db
      .from('conversation_attachments')
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
      .eq('id', safeAttachmentId)
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (attachmentError) {
      console.error('ATTACHMENT_DIRECT_SIGNED_LOOKUP_ERROR', {
        conversationId,
        attachmentId: safeAttachmentId,
        error: attachmentError,
      })

      return jsonError('Dosya bilgisi alınırken hata oluştu.', 500)
    }

    const attachment = normalizeAttachmentRow(data)

    if (!attachment) {
      return jsonError('Dosya bulunamadı.', 404)
    }

    if (!isSafeStoragePath(attachment.file_path, conversationId)) {
      console.error('ATTACHMENT_DIRECT_SIGNED_UNSAFE_PATH', {
        conversationId,
        attachmentId: attachment.id,
        filePath: attachment.file_path,
      })

      return jsonError('Dosya yolu güvenlik kontrolünden geçemedi.', 403)
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(attachment.file_path, SIGNED_URL_EXPIRES_IN_SECONDS, {
        download: sanitizeDownloadName(attachment.file_name),
      })

    if (signedError || !signedData?.signedUrl) {
      console.error('ATTACHMENT_DIRECT_SIGNED_URL_ERROR', {
        conversationId,
        attachmentId: attachment.id,
        filePath: attachment.file_path,
        error: signedError,
      })

      return jsonError('Dosya bağlantısı oluşturulamadı.', 500)
    }

    return NextResponse.json(
      {
        ok: true,
        signedUrl: signedData.signedUrl,
        expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
        attachment: {
          id: attachment.id,
          conversation_id: attachment.conversation_id,
          message_id: attachment.message_id,
          uploaded_by_type: attachment.uploaded_by_type,
          file_name: attachment.file_name,
          mime_type: attachment.mime_type,
          file_size: attachment.file_size,
          created_at: attachment.created_at,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('ATTACHMENT_DIRECT_SIGNED_UNEXPECTED_ERROR', error)
    return jsonError('Beklenmeyen bir hata oluştu.', 500)
  }
}
