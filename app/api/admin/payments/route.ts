import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type PaymentRow = {
  id: string
  client_id: string | null
  expert_id: string | null
  amount: number | string | null
  commission_amount: number | string | null
  expert_amount: number | string | null
  iyzico_token: string | null
  iyzico_payment_id: string | null
  iyzico_conversation_id: string | null
  payment_page_url: string | null
  status: string | null
  created_at: string
  paid_notified_at: string | null
  expert_payout_status: string | null
  expert_payout_paid_at: string | null
  expert_payout_note: string | null
  refunded_at: string | null
  admin_note: string | null
}

type ClientRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
}

type ExpertRow = {
  id: string
  name: string | null
  email: string | null
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin() as any

    const { data: paymentsData, error: paymentsError } = await supabase
      .from('payments')
      .select(
        `
        id,
        client_id,
        expert_id,
        amount,
        commission_amount,
        expert_amount,
        iyzico_token,
        iyzico_payment_id,
        iyzico_conversation_id,
        payment_page_url,
        status,
        created_at,
        paid_notified_at,
        expert_payout_status,
        expert_payout_paid_at,
        expert_payout_note,
        refunded_at,
        admin_note
      `
      )
      .order('created_at', { ascending: false })

    if (paymentsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödemeler alınamadı.',
          detail: paymentsError.message,
        },
        { status: 500 }
      )
    }

    const paymentRows = (paymentsData || []) as PaymentRow[]

    const clientIds = Array.from(
      new Set(
        paymentRows
          .map((payment: PaymentRow) => payment.client_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    const expertIds = Array.from(
      new Set(
        paymentRows
          .map((payment: PaymentRow) => payment.expert_id)
          .filter((id): id is string => Boolean(id))
      )
    )

    const [clientsResult, expertsResult] = await Promise.all([
      clientIds.length > 0
        ? supabase
            .from('client_applications')
            .select('id, name, email, phone')
            .in('id', clientIds)
        : Promise.resolve({ data: [], error: null }),

      expertIds.length > 0
        ? supabase.from('experts').select('id, name, email').in('id', expertIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (clientsResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan bilgileri alınamadı.',
          detail: clientsResult.error.message,
        },
        { status: 500 }
      )
    }

    if (expertsResult.error) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uzman bilgileri alınamadı.',
          detail: expertsResult.error.message,
        },
        { status: 500 }
      )
    }

    const clients = (clientsResult.data || []) as ClientRow[]
    const experts = (expertsResult.data || []) as ExpertRow[]

    const clientsById = new Map<string, ClientRow>(
      clients.map((client: ClientRow) => [client.id, client])
    )

    const expertsById = new Map<string, ExpertRow>(
      experts.map((expert: ExpertRow) => [expert.id, expert])
    )

    const enrichedPayments = paymentRows.map((payment: PaymentRow) => ({
      ...payment,
      amount: Number(payment.amount || 0),
      commission_amount: Number(payment.commission_amount || 0),
      expert_amount: Number(payment.expert_amount || 0),
      client_applications: payment.client_id
        ? clientsById.get(payment.client_id) || null
        : null,
      experts: payment.expert_id ? expertsById.get(payment.expert_id) || null : null,
    }))

    return NextResponse.json(
      {
        ok: true,
        count: enrichedPayments.length,
        payments: enrichedPayments,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Ödemeler alınırken beklenmeyen hata oluştu.',
        detail: err?.message || null,
      },
      { status: 500 }
    )
  }
}