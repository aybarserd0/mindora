import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type ExpertStatus = 'pending' | 'approved' | 'rejected' | 'passive'

const ALLOWED_STATUSES: ExpertStatus[] = [
  'pending',
  'approved',
  'rejected',
  'passive',
]

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeStatus(value: unknown): ExpertStatus | null {
  const clean = toText(value).toLowerCase()

  if (ALLOWED_STATUSES.includes(clean as ExpertStatus)) {
    return clean as ExpertStatus
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const id = toText(body?.id)
    const status = normalizeStatus(body?.status)

    if (!id) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli uzman ID gerekli.' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli uzman durumu gerekli.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin() as any

    const { data, error } = await supabaseAdmin
      .from('experts')
      .update({
        status,
      })
      .eq('id', id)
      .select('id, status')
      .maybeSingle()

    if (error) {
      console.error('EXPERT STATUS ERROR:', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Uzman durumu güncellenemedi.',
          detail: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uzman bulunamadı veya güncellenemedi.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      expert: data,
    })
  } catch (err: any) {
    console.error('EXPERT STATUS API ERROR:', err)

    return NextResponse.json(
      {
        ok: false,
        error: 'Sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}