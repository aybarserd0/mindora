import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendMail } from '@/lib/mail/smtp'
import { clientApplicationCancelledTemplate } from '@/lib/mail/templates'
import { createNotification } from '@/lib/notifications'

export const runtime = 'nodejs'

type ClientStatus =
  | 'new'
  | 'reviewing'
  | 'matched'
  | 'contacted'
  | 'completed'
  | 'cancelled'

type ClientStatusResponse = {
  id: string
  status: ClientStatus
}

const STATUS_MAP: Record<string, ClientStatus> = {
  new: 'new',
  reviewing: 'reviewing',
  matched: 'matched',
  contacted: 'contacted',
  completed: 'completed',
  cancelled: 'cancelled',

  in_review: 'reviewing',
  review: 'reviewing',
  contact: 'contacted',
  done: 'completed',
  complete: 'completed',
  canceled: 'cancelled',
  cancel: 'cancelled',
}

function toText(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeStatus(value: unknown): ClientStatus | null {
  const clean = toText(value).toLowerCase()
  if (!clean) return null

  return STATUS_MAP[clean] ?? null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)

    const clientId = toText(body?.clientId || body?.id)
    const status = normalizeStatus(body?.status)

    if (!clientId) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli clientId gerekli.' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { ok: false, error: 'Geçerli status gerekli.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin() as any

    const { data, error } = await supabase
      .from('client_applications')
      .update({
        status,
      })
      .eq('id', clientId)
      .select('id, status, name, email')
      .maybeSingle()

    if (error) {
      console.error('CLIENT STATUS UPDATE ERROR:', error)

      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan durumu güncellenemedi.',
          detail: error.message,
        },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Danışan kaydı bulunamadı veya güncellenemedi.',
        },
        { status: 404 }
      )
    }

    const client = data as ClientStatusResponse & { name?: string; email?: string | null }

    if (status === 'cancelled') {
      await createNotification({
        supabase,
        userType: 'client',
        userId: clientId,
        title: 'Başvurunuz hakkında',
        message: 'Mindora üzerinden yaptığınız başvuru bu aşamada sonlandırılmıştır.',
        type: 'system',
      })

      if (client.email) {
        try {
          await sendMail({
            to: client.email,
            subject: 'Mindora başvurunuz hakkında',
            text: clientApplicationCancelledTemplate({ clientName: client.name || 'Danışan' }),
          })
        } catch (mailError) {
          console.error('CLIENT STATUS MAIL ERROR:', mailError)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      client,
    })
  } catch (err: any) {
    console.error('CLIENT STATUS SERVER ERROR:', err)

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