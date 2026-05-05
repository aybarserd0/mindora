import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: payments, error: paymentsError } = await supabase
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

    const paymentRows = payments || []

    const clientIds = Array.from(
      new Set(paymentRows.map((p) => p.client_id).filter(Boolean))
    )

    const expertIds = Array.from(
      new Set(paymentRows.map((p) => p.expert_id).filter(Boolean))
    )

    const [{ data: clientsData, error: clientsError }, { data: expertsData, error: expertsError }] =
      await Promise.all([
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

    if (clientsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan bilgileri alınamadı.',
          detail: clientsError.message,
        },
        { status: 500 }
      )
    }

    if (expertsError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uzman bilgileri alınamadı.',
          detail: expertsError.message,
        },
        { status: 500 }
      )
    }

    const clientsById = new Map(
      (clientsData || []).map((client) => [client.id, client])
    )

    const expertsById = new Map(
      (expertsData || []).map((expert) => [expert.id, expert])
    )

    const enrichedPayments = paymentRows.map((payment) => ({
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