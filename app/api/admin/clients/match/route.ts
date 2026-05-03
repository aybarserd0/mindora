import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { clientId, expertId } = await req.json()

    const supabase = getSupabaseAdmin()

    const { error } = await supabase
      .from('client_applications')
      .update({
        matched_expert_id: expertId,
        status: 'matched',
      })
      .eq('id', clientId)

    if (error) {
      console.error(error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}