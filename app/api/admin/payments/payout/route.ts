import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded'
type ExpertPayoutStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | null

type PaymentRecord = {
  id: string
  status: PaymentStatus
  expert_payout_status: ExpertPayoutStatus
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const paymentId = toText(body?.paymentId)

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli paymentId gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin() as any

    const { data: paymentData, error: readError } = await supabase
      .from('payments')
      .select('id, status, expert_payout_status')
      .eq('id', paymentId)
      .maybeSingle()

    if (readError || !paymentData) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme kaydı bulunamadı.',
          detail: readError?.message || null,
        },
        { status: 404 }
      )
    }

    const payment = paymentData as PaymentRecord

    if (payment.status !== 'paid') {
      return NextResponse.json(
        {
          ok: false,
          error: 'Sadece başarılı ödemeler için uzman payout yapılabilir.',
        },
        { status: 400 }
      )
    }

    if (payment.expert_payout_status === 'paid') {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        message: 'Bu ödeme için uzman payout zaten ödenmiş görünüyor.',
        payment,
      })
    }

    const { data: updatedPaymentData, error: updateError } = await supabase
      .from('payments')
      .update({
        expert_payout_status: 'paid',
        expert_payout_paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select('*')
      .single()

    if (updateError || !updatedPaymentData) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Uzman payout durumu güncellenemedi.',
          detail: updateError?.message || null,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      payment: updatedPaymentData,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Payout işlemi sırasında beklenmeyen hata oluştu.',
      },
      { status: 500 }
    )
  }
}