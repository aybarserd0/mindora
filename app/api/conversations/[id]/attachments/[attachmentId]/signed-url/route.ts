import { NextRequest, NextResponse } from 'next/server'
import { verifyConversationAccessToken } from '@/lib/chat-access-tokens'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

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

type DbError = {
  message?: string
  details?: string
  hint?: string
  code?: string
}

type AttachmentDb = {
  from: (table: 'conversation_attachments') => {
    select: (columns: string) => {
      eq: (
        column: 'id' | 'conversation_id',
        value: string
      ) => {
        eq: (
          column: 'id' | 'conversation_id',
          value: string
        ) => {
          maybeSingle: () => Promise<{
            data: AttachmentRow | null
            error: DbError | null
          }>
        }
        maybeSingle: () => Promise<{
          data: AttachmentRow | null
          error: DbError | null
        }>
      }
    }
  }
}

const BUCKET_NAME = 'chat-attachments'
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 5

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  )
}

function isValidUserType(value: unknown): value is UserType {
  return value === 'client' || value === 'expert'
}

function toAttachmentDb(client: unknown): AttachmentDb {
  return client as AttachmentDb
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
    const { id: conversationId, attachmentId } = await params

    if (!conversationId) {
      return jsonError('Conversation ID eksik.', 400)
    }

    if (!attachmentId) {
      return jsonError('Attachment ID eksik.', 400)
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

    const supabase = getSupabaseAdmin()
    const attachmentDb = toAttachmentDb(supabase)

    const { data: attachment, error: attachmentError } = await attachmentDb
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
      .eq('id', attachmentId)
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (attachmentError) {
      console.error('Attachment lookup error:', attachmentError)
      return jsonError('Dosya bilgisi alınırken hata oluştu.', 500)
    }

    if (!attachment) {
      return jsonError('Dosya bulunamadı.', 404)
    }

    if (!attachment.file_path) {
      return jsonError('Dosya yolu bulunamadı.', 404)
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(
        attachment.file_path,
        SIGNED_URL_EXPIRES_IN_SECONDS,
        {
          download: attachment.file_name,
        }
      )

    if (signedError || !signedData?.signedUrl) {
      console.error('Attachment signed URL error:', signedError)
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
    console.error('Unexpected attachment signed URL error:', error)
    return jsonError('Beklenmeyen bir hata oluştu.', 500)
  }
}