import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const allowedStatuses = ['pending', 'approved', 'rejected', 'passive']

export async function POST(req: NextRequest) {
  try {
    const { id, status } = await req.json()

    if (!id || !allowedStatuses.includes(status)) {
      return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('experts')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('EXPERT STATUS ERROR:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('EXPERT STATUS API ERROR:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}