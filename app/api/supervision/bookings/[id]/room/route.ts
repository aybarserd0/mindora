import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { db, getBookingRole, jsonError, requireExpert, roomWindow } from '@/lib/supervision/server'

export const runtime = 'nodejs'

// Süpervizyon görüntülü odası için kısa ömürlü LiveKit token'ı.
// Yalnızca iki taraf, yalnızca onaylı randevuda ve yalnızca seans penceresinde.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireExpert(req, 'supervision-room')
  if ('response' in auth) return auth.response

  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  const serverUrl = (process.env.LIVEKIT_URL || '').trim()
  if (!apiKey || !apiSecret || !serverUrl) return jsonError('Görüntülü görüşme altyapısı yapılandırılmamış.', 500)

  const { id } = await ctx.params
  const found = await getBookingRole(id, auth.expertId)
  if (!found) return jsonError('Randevu bulunamadı.', 404)

  const { role, booking } = found
  if (booking.status !== 'confirmed' || !booking.room_name) return jsonError('Bu randevu henüz onaylanmadı.', 409)

  const { opensAt, closesAt } = roomWindow(booking.requested_start, booking.duration_minutes)
  const now = Date.now()
  if (now < opensAt) return jsonError('Oda seans saatinden 10 dakika önce açılır.', 409)
  if (now > closesAt) return jsonError('Bu seansın süresi doldu.', 410)

  const { data: me } = await db().from('experts').select('name').eq('id', auth.expertId).maybeSingle()

  const token = new AccessToken(apiKey, apiSecret, {
    identity: `${role}:${auth.expertId}`,
    name: (me?.name || (role === 'supervisor' ? 'Süpervizör' : 'Psikolog')).slice(0, 80),
    ttl: Math.max(60, Math.floor((closesAt - now) / 1000)),
    metadata: JSON.stringify({ supervisionBookingId: booking.id, role }),
  })
  token.addGrant({ roomJoin: true, room: booking.room_name, canPublish: true, canSubscribe: true, canPublishData: true })

  return NextResponse.json({ ok: true, token: await token.toJwt(), serverUrl, role })
}
