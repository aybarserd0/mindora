import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const paymentId = body?.paymentId

    if (!paymentId || typeof paymentId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Geçerli paymentId gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: payment, error: readError } = await supabase
      .from('payments')
      .select('id, status, expert_payout_status')
      .eq('id', paymentId)
      .maybeSingle()

    if (readError || !payment) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ödeme kaydı bulunamadı.',
          detail: readError?.message || null,
        },
        { status: 404 }
      )
    }

    if (payment.status !== 'paid') {
      return NextResponse.json(
        { ok: false, error: 'Sadece başarılı ödemeler için uzman payout yapılabilir.' },
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

    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        expert_payout_status: 'paid',
        expert_payout_paid_at: new Date().toISOString(),
      })
      .eq('id', paymentId)
      .select('*')
      .single()

    if (updateError || !updatedPayment) {
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
      payment: updatedPayment,
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