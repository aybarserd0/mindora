import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('client_applications')
      .select(`
        id,
        name,
        phone,
        age,
        topic,
        duration,
        previous_support,
        start_time,
        preference,
        availability,
        note,
        status,
        matched_expert_id,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('ADMIN CLIENTS ERROR:', error)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    return NextResponse.json({ ok: true, clients: data ?? [] })
  } catch (err) {
    console.error('ADMIN CLIENTS SERVER ERROR:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}