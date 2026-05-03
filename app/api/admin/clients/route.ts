import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type ClientStatus =
  | 'new'
  | 'reviewing'
  | 'matched'
  | 'contacted'
  | 'completed'
  | 'cancelled'

type ClientRow = {
  id: string
  name: string | null
  phone: string | null
  age: string | null
  topic: string | null
  duration: string | null
  previous_support: string | null
  start_time: string | null
  preference: string | null
  availability: string | null
  note: string | null
  status: ClientStatus
  matched_expert_id: string | null
  created_at: string
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('client_applications')
      .select(
        `
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
      `
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('ADMIN CLIENTS DB ERROR:', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan başvuruları alınamadı.',
        },
        { status: 500 }
      )
    }

    const clients: ClientRow[] = (data ?? []).map((client) => ({
      id: client.id,
      name: client.name ?? null,
      phone: client.phone ?? null,
      age: client.age ?? null,
      topic: client.topic ?? null,
      duration: client.duration ?? null,
      previous_support: client.previous_support ?? null,
      start_time: client.start_time ?? null,
      preference: client.preference ?? null,
      availability: client.availability ?? null,
      note: client.note ?? null,
      status: client.status,
      matched_expert_id: client.matched_expert_id ?? null,
      created_at: client.created_at,
    }))

    return NextResponse.json(
      {
        ok: true,
        count: clients.length,
        clients,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err) {
    console.error('ADMIN CLIENTS SERVER ERROR:', err)

    return NextResponse.json(
      {
        ok: false,
        error: 'Sunucu hatası oluştu.',
      },
      { status: 500 }
    )
  }
}