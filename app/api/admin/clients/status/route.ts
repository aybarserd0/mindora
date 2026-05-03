import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const ALLOWED_STATUSES = [
  'new',
  'reviewing',
  'matched',
  'contacted',
  'completed',
  'cancelled',
]

export async function POST(req: NextRequest) {
  try {
    const { clientId, status } = await req.json()

    if (!clientId || !status) {
      return NextResponse.json(
        { ok: false, error: 'clientId ve status gerekli.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json(
        { ok: false, error: 'Geçersiz status.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('client_applications')
      .update({ status })
      .eq('id', clientId)

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Sunucu hatası' },
      { status: 500 }
    )
  }
}