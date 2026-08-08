import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getExpertIdFromRequest } from '@/lib/security/expert-session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'expert-verifications'
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const allowedDocumentTypes = ['diploma', 'license', 'certificate', 'identity'] as const
type DocumentType = (typeof allowedDocumentTypes)[number]

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
])

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function normalizeText(value: unknown) {
  return String(value || '').trim()
}

function isAllowedDocumentType(value: string): value is DocumentType {
  return allowedDocumentTypes.includes(value as DocumentType)
}

function getFileExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()

  if (fromName && /^[a-z0-9]{2,8}$/.test(fromName)) {
    return fromName
  }

  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  if (file.type === 'image/jpeg') return 'jpg'

  return 'bin'
}

function sanitizeFileName(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

async function resolveExpertId(request: NextRequest) {
  return getExpertIdFromRequest(request)
}

export async function POST(request: NextRequest) {
  let uploadedPath = ''

  try {
    const contentType = request.headers.get('content-type') || ''

    if (!contentType.toLowerCase().includes('multipart/form-data')) {
      return jsonError('Dosya yüklemek için multipart/form-data isteği gereklidir.', 415)
    }

    const formData = await request.formData()

    const documentType = normalizeText(formData.get('documentType'))
    const expertId = await resolveExpertId(request)
    const file = formData.get('file')

    if (!expertId) {
      return jsonError('Uzman kimliği bulunamadı.', 401)
    }

    if (!isAllowedDocumentType(documentType)) {
      return jsonError('Geçerli bir belge türü seçilmelidir.')
    }

    if (!(file instanceof File)) {
      return jsonError('Yüklenecek dosya bulunamadı.')
    }

    if (!allowedMimeTypes.has(file.type)) {
      return jsonError('Sadece PDF, PNG veya JPG dosyaları yüklenebilir.')
    }

    if (file.size <= 0) {
      return jsonError('Boş dosya yüklenemez.')
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError('Dosya boyutu en fazla 10 MB olabilir.')
    }

    const supabase = getSupabaseAdmin()
    const supabaseAny = supabase as any

    const safeOriginalName = sanitizeFileName(file.name) || `${documentType}.${getFileExtension(file)}`
    const extension = getFileExtension(file)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const randomPart = crypto.randomUUID()
    const filePath = `${expertId}/${documentType}/${timestamp}-${randomPart}.${extension}`

    const bytes = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('EXPERT_VERIFICATION_UPLOAD_STORAGE_ERROR', uploadError)
      return jsonError('Belge dosyası yüklenemedi.', 500)
    }

    uploadedPath = filePath

    const { data, error: insertError } = await supabaseAny
      .from('expert_verifications')
      .insert({
        expert_id: expertId,
        document_type: documentType,
        file_name: safeOriginalName,
        file_path: filePath,
        file_size: file.size,
        status: 'pending',
      })
      .select('id, expert_id, document_type, file_name, file_path, file_size, status, created_at')
      .single()

    if (insertError) {
      console.error('EXPERT_VERIFICATION_UPLOAD_DB_ERROR', insertError)

      if (uploadedPath) {
        await supabase.storage.from(BUCKET_NAME).remove([uploadedPath])
      }

      return jsonError('Belge kaydı oluşturulamadı.', 500)
    }

    return NextResponse.json({
      ok: true,
      verification: data,
      message: 'Belge başarıyla yüklendi ve incelemeye alındı.',
    })
  } catch (error) {
    console.error('POST /api/expert/verification/upload error:', error)

    try {
      if (uploadedPath) {
        await getSupabaseAdmin().storage.from(BUCKET_NAME).remove([uploadedPath])
      }
    } catch (cleanupError) {
      console.error('EXPERT_VERIFICATION_UPLOAD_CLEANUP_ERROR', cleanupError)
    }

    return jsonError('Beklenmeyen bir hata oluştu.', 500)
  }
}
