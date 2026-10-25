import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { applyRateLimit } from '@/lib/security/rate-limit'
import { resolveClientAccess, withToken } from '@/lib/client-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = applyRateLimit(req, { scope: 'client-profile', limit: 60, windowMs: 60_000 })
  if (limited) return limited

  const token = req.nextUrl.searchParams.get('token') || ''
  const access = await resolveClientAccess(token)
  if (!access) {
    return NextResponse.json({ ok: false, error: 'Güvenli erişim bağlantısı doğrulanamadı.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdmin() as any
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [{ data: client }, { data: expert }, { data: bookings }, { count: paymentCount }, { count: messageCount }] =
    await Promise.all([
      supabase
        .from('client_applications')
        .select('id, name, email, phone, age, topic, preference, previous_support, availability, note, status, created_at')
        .eq('id', access.clientApplicationId)
        .maybeSingle(),
      supabase
        .from('experts')
        .select('id, name, title, photo_url, slug, specialties')
        .eq('id', access.expertId)
        .maybeSingle(),
      supabase
        .from('session_bookings')
        .select('status, scheduled_start_at')
        .or(`conversation_id.eq.${access.conversationId},client_id.eq.${access.clientApplicationId}`),
      supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', access.clientApplicationId)
        .eq('status', 'paid'),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', access.conversationId)
        .gte('created_at', since),
    ])

  const list = (bookings || []) as { status: string; scheduled_start_at: string }[]
  const now = Date.now()

  return NextResponse.json({
    ok: true,
    client: client
      ? {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          age: client.age,
          topic: client.topic,
          preference: client.preference,
          previousSupport: client.previous_support,
          availability: client.availability,
          note: client.note,
          status: client.status,
          createdAt: client.created_at,
        }
      : null,
    expert: expert
      ? {
          id: expert.id,
          name: expert.name,
          title: expert.title,
          photoUrl: expert.photo_url,
          slug: expert.slug,
          specialties: expert.specialties,
        }
      : null,
    stats: {
      totalSessions: list.length,
      completedSessions: list.filter((b) => b.status === 'completed').length,
      upcomingSessions: list.filter(
        (b) => ['scheduled', 'confirmed'].includes(b.status) && new Date(b.scheduled_start_at).getTime() > now
      ).length,
      totalPayments: paymentCount || 0,
      recentMessages: messageCount || 0,
    },
    paymentStatus: access.paymentStatus,
    conversationId: access.conversationId,
    chatHref: withToken(`/client/chat/${access.conversationId}`, token),
  })
}
