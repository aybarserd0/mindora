import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'expert-verifications'
const SIGNED_URL_TTL_SECONDS = 60 * 5

type RouteContext = {
  params: Promise<{
    id: string
  }>
}

type VerificationRow = {
  id: string
  file_name: string | null
  file_path: string | null
  file_size: number | null
  document_type: string | null
  status: string | null
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
}

function isSafeStoragePath(value: string) {
  if (!value) return false
  if (value.startsWith('/')) return false
  if (value.includes('..')) return false
  if (value.includes('\\')) return false
  if (value.length > 600) return false

  return /^[a-zA-Z0-9/_.,@-]+$/.test(value)
}

function getContentDisposition(fileName: string, mode: string) {
  const safeFileName = normalizeText(fileName)
    .replace(/[\r\n"]/g, '')
    .slice(0, 160) || 'mindora-belge'

  if (mode === 'download') {
    return `attachment; filename="${safeFileName}"`
  }

  return `inline; filename="${safeFileName}"`
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const verificationId = normalizeText(id)

    if (!verificationId || !isValidUuid(verificationId)) {
      return jsonError('Geçerli doğrulama kaydı gerekli.')
    }

    const mode = normalizeText(request.nextUrl.searchParams.get('mode')).toLowerCase()
    const safeMode = mode === 'download' ? 'download' : 'preview'

    const supabase = getSupabaseAdmin() as any

    const { data, error } = await supabase
      .from('expert_verifications')
      .select('id, file_name, file_path, file_size, document_type, status')
      .eq('id', verificationId)
      .single()

    if (error || !data) {
      console.error('ADMIN_EXPERT_VERIFICATION_SIGNED_URL_QUERY_ERROR', error)
      return jsonError('Doğrulama belgesi bulunamadı.', 404)
    }

    const row = data as VerificationRow
    const filePath = normalizeText(row.file_path)

    if (!isSafeStoragePath(filePath)) {
      return jsonError('Belge dosya yolu geçersiz.', 400)
    }

    const fileName = normalizeText(row.file_name) || 'mindora-belge'
    const download = safeMode === 'download'

    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS, {
        download,
      })

    if (signedError || !signedData?.signedUrl) {
      console.error('ADMIN_EXPERT_VERIFICATION_SIGNED_URL_STORAGE_ERROR', signedError)
      return jsonError('Güvenli belge bağlantısı oluşturulamadı.', 500)
    }

    return NextResponse.json({
      ok: true,
      signedUrl: signedData.signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
      mode: safeMode,
      fileName,
      fileSize: row.file_size || 0,
      documentType: row.document_type || null,
      status: row.status || null,
      contentDisposition: getContentDisposition(fileName, safeMode),
    })
  } catch (error) {
    console.error('GET /api/admin/expert-verifications/[id]/signed-url error:', error)
    return jsonError('Beklenmeyen bir hata oluştu.', 500)
  }
}
