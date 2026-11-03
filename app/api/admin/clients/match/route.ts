import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { performMatch } from '@/lib/matching/perform-match'

export const runtime = 'nodejs'

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Admin: danışanı seçilen uzmanla eşleştirir ya da otomatik eşleşmeyi değiştirir. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const clientId = toText(body?.clientId)
    const expertId = toText(body?.expertId)

    if (!clientId || !expertId) {
      return NextResponse.json({ ok: false, error: 'Danışan ve uzman seçimi zorunlu.' }, { status: 400 })
    }

    const result = await performMatch({ supabase: getSupabaseAdmin(), clientId, expertId, source: 'admin' })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      ok: true,
      message: 'Eşleştirme başarıyla yapıldı.',
      conversation: result.conversation,
      links: result.links,
      mail: result.mail,
    })
  } catch (err) {
    console.error('MATCH SERVER ERROR:', err)
    return NextResponse.json({ ok: false, error: 'Sunucu hatası oluştu.' }, { status: 500 })
  }
}
