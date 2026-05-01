import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('experts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('EXPERTS LIST ERROR:', error)
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, experts: data })
  } catch (err) {
    console.error('EXPERTS API ERROR:', err)
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 })
  }
}