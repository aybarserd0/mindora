import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type UserType = 'client' | 'expert' | 'admin'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('conversation_reads')
      .select('user_type,last_read_at')
      .eq('conversation_id', id)

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Okunma bilgisi alınamadı.' },
        { status: 500 }
      )
    }

    const reads: Record<UserType, string | null> = {
      client: null,
      expert: null,
      admin: null,
    }

    for (const item of data || []) {
      const userType = item.user_type as UserType

      if (userType === 'client' || userType === 'expert' || userType === 'admin') {
        reads[userType] = item.last_read_at
      }
    }

    return NextResponse.json({
      ok: true,
      reads,
    })
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Sunucu hatası.' },
      { status: 500 }
    )
  }
}