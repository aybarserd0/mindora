import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('experts')
      .select(
        'id, name, title, areas, experience, online, price, availability, created_at'
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('PUBLIC EXPERTS ERROR:', error)

      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      experts: data || [],
    })
  } catch (error) {
    console.error('PUBLIC EXPERTS API ERROR:', error)

    return NextResponse.json(
      { ok: false, error: 'Server error' },
      { status: 500 }
    )
  }
}