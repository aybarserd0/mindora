import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getSupervisedExpertIds } from '@/lib/supervision/badge'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('experts')
      .select(
        `
        id,
        name,
        title,
        areas,
        experience,
        online,
        availability,
        photo_url,
        created_at
      `
      )
      .eq('status', 'approved')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('PUBLIC EXPERTS DB ERROR:', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Onaylı uzmanlar alınamadı.',
        },
        { status: 500 }
      )
    }

    const supervised = await getSupervisedExpertIds()

    return NextResponse.json({
      ok: true,
      experts: (data || []).map((expert) => ({
        ...expert,
        supervised: supervised.has(expert.id),
      })),
    })
  } catch (error) {
    console.error('PUBLIC EXPERTS API ERROR:', error)

    return NextResponse.json(
      {
        ok: false,
        error: 'Sunucu hatası.',
      },
      { status: 500 }
    )
  }
}