import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        client_id,
        expert_id,
        amount,
        commission_amount,
        expert_amount,
        iyzico_token,
        iyzico_payment_id,
        iyzico_conversation_id,
        status,
        created_at,
        client_applications (
          id,
          name,
          email,
          phone
        ),
        experts (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      payments: payments || [],
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || 'Ödemeler alınırken beklenmeyen hata oluştu.',
      },
      { status: 500 }
    )
  }
}