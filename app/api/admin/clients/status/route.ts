import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type ClientStatus =
  | 'new'
  | 'reviewing'
  | 'matched'
  | 'contacted'
  | 'completed'
  | 'cancelled'

const STATUS_MAP: Record<string, ClientStatus> = {
  new: 'new',
  reviewing: 'reviewing',
  matched: 'matched',
  contacted: 'contacted',
  completed: 'completed',
  cancelled: 'cancelled',

  in_review: 'reviewing',
  contact: 'contacted',
  done: 'completed',
  canceled: 'cancelled',
  cancel: 'cancelled',
}

function normalizeStatus(value: unknown): ClientStatus | null {
  if (typeof value !== 'string') return null
  return STATUS_MAP[value.trim().toLowerCase()] ?? null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const clientId = body.clientId || body.id
    const status = normalizeStatus(body.status)

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Geçerli clientId gerekli.' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli status gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('client_applications')
      .update({ status })
      .eq('id', clientId)
      .select('id, status')
      .maybeSingle()

    if (error) {
      console.error('CLIENT STATUS UPDATE ERROR:', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan durumu güncellenemedi.',
          detail: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan kaydı bulunamadı veya güncellenemedi.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      client: data,
    })
  } catch (err: any) {
    console.error('CLIENT STATUS SERVER ERROR:', err)

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