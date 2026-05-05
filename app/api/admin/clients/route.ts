import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type ClientStatus =
  | 'new'
  | 'reviewing'
  | 'matched'
  | 'contacted'
  | 'completed'
  | 'cancelled'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'

type LatestPayment = {
  id: string
  status: PaymentStatus
  amount: number
  commission_amount: number
  expert_amount: number
  payment_page_url: string | null
  iyzico_payment_id: string | null
  expert_payout_status: string | null
  expert_payout_paid_at: string | null
  created_at: string
}

type ClientRow = {
  id: string
  name: string | null
  phone: string | null
  email: string | null
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
  latest_payment: LatestPayment | null
}

function normalizePayment(payment: any): LatestPayment | null {
  if (!payment) return null

  return {
    id: payment.id,
    status: payment.status,
    amount: Number(payment.amount || 0),
    commission_amount: Number(payment.commission_amount || 0),
    expert_amount: Number(payment.expert_amount || 0),
    payment_page_url: payment.payment_page_url ?? null,
    iyzico_payment_id: payment.iyzico_payment_id ?? null,
    expert_payout_status: payment.expert_payout_status ?? null,
    expert_payout_paid_at: payment.expert_payout_paid_at ?? null,
    created_at: payment.created_at,
  }
}

function normalizeClient(client: any, latestPayment: LatestPayment | null): ClientRow {
  return {
    id: client.id,
    name: client.name ?? null,
    phone: client.phone ?? null,
    email: client.email ?? null,
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
    latest_payment: latestPayment,
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: clientsData, error: clientsError } = await supabase
      .from('client_applications')
      .select(
        `
        id,
        name,
        phone,
        email,
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

    if (clientsError) {
      console.error('ADMIN CLIENTS DB ERROR:', clientsError)

      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan başvuruları alınamadı.',
          detail: clientsError.message,
        },
        { status: 500 }
      )
    }

    const clientsRaw = clientsData || []
    const clientIds = clientsRaw.map((client) => client.id)

    let latestPaymentsByClientId: Record<string, LatestPayment> = {}

    if (clientIds.length > 0) {
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(
          `
          id,
          client_id,
          status,
          amount,
          commission_amount,
          expert_amount,
          payment_page_url,
          iyzico_payment_id,
          expert_payout_status,
          expert_payout_paid_at,
          created_at
        `
        )
        .in('client_id', clientIds)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        console.error('ADMIN CLIENTS PAYMENTS DB ERROR:', paymentsError)

        return NextResponse.json(
          {
            ok: false,
            error: 'Danışan ödeme bilgileri alınamadı.',
            detail: paymentsError.message,
          },
          { status: 500 }
        )
      }

      for (const payment of paymentsData || []) {
        const clientId = payment.client_id

        if (!clientId) continue
        if (latestPaymentsByClientId[clientId]) continue

        const normalized = normalizePayment(payment)

        if (normalized) {
          latestPaymentsByClientId[clientId] = normalized
        }
      }
    }

    const clients = clientsRaw.map((client) =>
      normalizeClient(client, latestPaymentsByClientId[client.id] || null)
    )

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
  } catch (err: any) {
    console.error('ADMIN CLIENTS SERVER ERROR:', err)

    return NextResponse.json(
      {
        ok: false,
        error: 'Sunucu hatası oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}