import { NextRequest, NextResponse } from 'next/server'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { resolveClientAccess } from '@/lib/client-access'
import { FREE_CANCELLATION_HOURS } from '@/lib/payments/policy'
import { getBookableExpert, getClientBookableSlots } from '@/lib/scheduling/client-booking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Danışanın eşleştiği uzmanın açık saatleri ve seans ücreti. */
export async function GET(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-slots', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const access = await resolveClientAccess(req.nextUrl.searchParams.get('token'))
  if (!access) {
    return NextResponse.json({ ok: false, error: 'Güvenli erişim bağlantısı doğrulanamadı.' }, { status: 401 })
  }

  const expert = await getBookableExpert(access.expertId)
  if (!expert || expert.status !== 'approved') {
    return NextResponse.json({ ok: false, error: 'Uzmanın şu anda yeni randevu kabul etmiyor.' }, { status: 409 })
  }

  const price = Number(expert.session_price)
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ ok: false, error: 'Uzmanının seans ücreti henüz tanımlanmamış. Mindora ekibine yazabilirsin.' }, { status: 409 })
  }

  try {
    const slots = await getClientBookableSlots(expert.id)
    return NextResponse.json({
      ok: true,
      expert: { name: expert.name, title: expert.title, price },
      slots,
      freeCancellationHours: FREE_CANCELLATION_HOURS,
    })
  } catch (error) {
    console.error('CLIENT_SLOTS_ERROR', error)
    return NextResponse.json({ ok: false, error: 'Uygun saatler şu anda alınamadı.' }, { status: 500 })
  }
}
