import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { cleanUuid } from '@/lib/security/validation'
import { resolveClientAccess, withToken } from '@/lib/client-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'chat-attachments'
const SIGNED_URL_SECONDS = 60

type AttachmentRow = {
  id: string
  conversation_id: string
  message_id: string | null
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  uploaded_by_type: string
  created_at: string
}

/**
 * Danışanın sohbetindeki dosyalar. ?download=<id> verilirse kısa ömürlü
 * imzalı bağlantıya yönlendirir (bağlantı sohbet erişimi doğrulandıktan sonra üretilir).
 */
export async function GET(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-files', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const token = req.nextUrl.searchParams.get('token') || ''
  const access = await resolveClientAccess(token)
  if (!access) {
    return NextResponse.json({ ok: false, error: 'Güvenli erişim bağlantısı doğrulanamadı.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const downloadId = cleanUuid(req.nextUrl.searchParams.get('download'))

  if (downloadId) {
    const { data: attachment } = await supabase
      .from('conversation_attachments')
      .select('file_path, file_name, conversation_id')
      .eq('id', downloadId)
      .eq('conversation_id', access.conversationId)
      .maybeSingle()

    if (!attachment) return NextResponse.json({ ok: false, error: 'Dosya bulunamadı.' }, { status: 404 })

    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.file_path, SIGNED_URL_SECONDS, { download: attachment.file_name })

    if (error || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: 'Dosya bağlantısı oluşturulamadı.' }, { status: 500 })
    }
    return NextResponse.redirect(signed.signedUrl)
  }

  const { data, error } = await supabase
    .from('conversation_attachments')
    .select('id, conversation_id, message_id, file_name, file_path, file_size, mime_type, uploaded_by_type, created_at')
    .eq('conversation_id', access.conversationId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('CLIENT_FILES_ERROR', error)
    return NextResponse.json({ ok: false, error: 'Dosyalar şu anda alınamadı.' }, { status: 500 })
  }

  const files = ((data || []) as AttachmentRow[]).map((f) => ({
    id: f.id,
    conversationId: f.conversation_id,
    messageId: f.message_id,
    name: f.file_name,
    mimeType: f.mime_type,
    sizeBytes: f.file_size,
    downloadUrl: withToken(`/api/client/files?download=${f.id}`, token),
    ownerType: f.uploaded_by_type,
    senderType: f.uploaded_by_type,
    createdAt: f.created_at,
  }))

  return NextResponse.json({ ok: true, files })
}
