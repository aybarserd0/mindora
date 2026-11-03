/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase istemcisi yeni sütunlarla birlikte gevşek tipli kullanılıyor (mevcut rotalardaki gibi) */
import { autoMatchApplication } from '@/lib/matching/auto-match'
import { createWeeklyPayouts, istanbulWeekday, PAYOUT_WEEKDAY } from '@/lib/automation/payouts'
import { loadDocumentSummaries } from '@/lib/automation/verification'
import { isValidTrIban } from '@/lib/payments/iban'
import {
  clientSessionsLink,
  expertDocsText,
  expertMissingIbanText,
  expertSetupText,
  reengageText,
  safeSend,
  sendAdminDigest,
  unpaidReminderText,
  waitingNoticeText,
  type AdminDigest,
} from '@/lib/automation/notify'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Otomasyonun zamanlamaları; tek yerden ayarlanır. */
export const AUTOMATION_TIMING = {
  /** Form gönderildiğinde eşleşemeyen başvuru bu kadar sonra yeniden denenir */
  retryMatchAfterMinutes: 15,
  /** Uygun uzman bulunamayan danışana "arıyoruz" e-postası */
  waitingNoticeAfterHours: 24,
  /** Eşleşip saat seçmeyen danışana hatırlatma */
  unpaidReminderAfterHours: 48,
  /** Son seanstan bu kadar gün sonra "devam etmek ister misin" */
  reengageAfterDays: 21,
  /** Saati bittikten bu kadar sonra görüşme yapılmışsa seans kapatılır */
  completeBookingAfterHours: 2,
  /** Uzmana takvim/ücret/IBAN hatırlatması tekrarı */
  expertSetupEveryDays: 7,
  /** Belge hatırlatması tekrarı ve üst sınırı */
  docsReminderEveryDays: 3,
  docsReminderMax: 3,
}

export type DailyReport = {
  autoMatched: number
  waitingNotices: number
  unpaidReminders: number
  reengaged: number
  bookingsCompleted: number
  expertSetupReminders: number
  expertDocsReminders: number
  payouts: { created: number; missingIban: number } | null
  digestSent: boolean
  errors: string[]
}

function hoursSince(iso: string, now: Date) {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / HOUR)
}

function istanbulDateTime(iso: string) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

/** Her gün bir kez çalışır. Her adım bağımsızdır: biri hata verirse diğerleri yine çalışır. */
export async function runDailyAutomation(supabase: any, now = new Date()): Promise<DailyReport> {
  const report: DailyReport = {
    autoMatched: 0,
    waitingNotices: 0,
    unpaidReminders: 0,
    reengaged: 0,
    bookingsCompleted: 0,
    expertSetupReminders: 0,
    expertDocsReminders: 0,
    payouts: null,
    digestSent: false,
    errors: [],
  }
  const digest: AdminDigest = {
    unmatched: [],
    readyForReview: [],
    unclearBookings: [],
    payouts: null,
    stats: { autoMatched: 0, completedBookings: 0, remindersSent: 0 },
  }

  const step = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn()
    } catch (error) {
      console.error(`DAILY_AUTOMATION_${name}_ERROR`, error)
      report.errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  await step('MATCH', () => retryUnmatched(supabase, now, report, digest))
  await step('UNPAID', () => remindUnpaid(supabase, now, report))
  await step('BOOKINGS', () => completeFinishedBookings(supabase, now, report, digest))
  await step('REENGAGE', () => reengageClients(supabase, now, report))
  await step('EXPERTS', () => remindExperts(supabase, now, report, digest))

  if (istanbulWeekday(now) === PAYOUT_WEEKDAY) {
    await step('PAYOUTS', async () => {
      const result = await createWeeklyPayouts(supabase, now)
      report.payouts = { created: result.created.length, missingIban: result.missingIban.length }
      digest.payouts = { created: result.created, missingIban: result.missingIban }
      for (const m of result.missingIban) {
        const mail = expertMissingIbanText({ name: m.name, amount: m.amount })
        await safeSend(m.email, mail.subject, mail.text)
      }
    })
  }

  digest.stats = {
    autoMatched: report.autoMatched,
    completedBookings: report.bookingsCompleted,
    remindersSent:
      report.waitingNotices + report.unpaidReminders + report.reengaged + report.expertSetupReminders + report.expertDocsReminders,
  }
  report.digestSent = await sendAdminDigest(digest)

  return report
}

// 1) Eşleşemeyen başvuruları yeniden dene; uzun bekleyenlere haber ver
async function retryUnmatched(supabase: any, now: Date, report: DailyReport, digest: AdminDigest) {
  const cutoff = new Date(now.getTime() - AUTOMATION_TIMING.retryMatchAfterMinutes * 60_000).toISOString()
  const { data: apps, error } = await supabase
    .from('client_applications')
    .select('id, name, email, profession, created_at, waiting_notice_sent_at')
    .eq('status', 'new')
    .is('matched_expert_id', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) throw new Error(error.message)

  for (const app of apps || []) {
    const outcome = await autoMatchApplication(supabase, app.id)
    if (outcome.matched) {
      report.autoMatched += 1
      continue
    }

    const hours = hoursSince(app.created_at, now)
    digest.unmatched.push({ id: app.id, name: app.name, profession: app.profession, hours })

    if (!app.waiting_notice_sent_at && hours >= AUTOMATION_TIMING.waitingNoticeAfterHours) {
      const mail = waitingNoticeText({ name: app.name, profession: app.profession })
      if (await safeSend(app.email, mail.subject, mail.text)) {
        await supabase.from('client_applications').update({ waiting_notice_sent_at: now.toISOString() }).eq('id', app.id)
        report.waitingNotices += 1
      }
    }
  }
}

// 2) Eşleşip saat seçmeyen (ödeme yapmayan) danışana bir kez hatırlatma
async function remindUnpaid(supabase: any, now: Date, report: DailyReport) {
  const cutoff = new Date(now.getTime() - AUTOMATION_TIMING.unpaidReminderAfterHours * HOUR).toISOString()
  const { data: apps, error } = await supabase
    .from('client_applications')
    .select('id, name, email, profession')
    .eq('status', 'matched')
    .is('unpaid_reminder_sent_at', null)
    .lt('matched_at', cutoff)
    .limit(100)
  if (error) throw new Error(error.message)
  if (!apps?.length) return

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, client_application_id, payment_status')
    .in('client_application_id', apps.map((a: { id: string }) => a.id))
  const convByApp = new Map((conversations || []).map((c: any) => [c.client_application_id, c]))

  for (const app of apps) {
    const conv: any = convByApp.get(app.id)
    if (!conv || conv.payment_status === 'paid') continue
    const link = await clientSessionsLink(conv.id)
    const mail = unpaidReminderText({ name: app.name, profession: app.profession, link })
    if (await safeSend(app.email, mail.subject, mail.text)) {
      await supabase.from('client_applications').update({ unpaid_reminder_sent_at: now.toISOString() }).eq('id', app.id)
      report.unpaidReminders += 1
    }
  }
}

// 3) Saati geçmiş seansları kapat. Görüşme odasına katılım varsa "tamamlandı";
//    yoksa admin özetine düşer ve uzman ödemesi bekletilir.
async function completeFinishedBookings(supabase: any, now: Date, report: DailyReport, digest: AdminDigest) {
  const cutoff = new Date(now.getTime() - AUTOMATION_TIMING.completeBookingAfterHours * HOUR).toISOString()
  const since = new Date(now.getTime() - 14 * DAY).toISOString()
  const { data: bookings, error } = await supabase
    .from('session_bookings')
    .select('id, live_session_id, scheduled_start_at, scheduled_end_at, status')
    .in('status', ['scheduled', 'confirmed', 'active'])
    .lt('scheduled_end_at', cutoff)
    .gt('scheduled_end_at', since)
    .limit(500)
  if (error) throw new Error(error.message)
  if (!bookings?.length) return

  const sessionIds = bookings.map((b: any) => b.live_session_id).filter(Boolean)
  const { data: sessions } = sessionIds.length
    ? await supabase.from('sessions').select('id, status, started_at').in('id', sessionIds)
    : { data: [] }
  const sessionById = new Map((sessions || []).map((s: any) => [s.id, s]))

  const { data: paid } = await supabase
    .from('payments')
    .select('booking_id')
    .eq('status', 'paid')
    .in('booking_id', bookings.map((b: any) => b.id))
  const paidBookingIds = new Set((paid || []).map((p: any) => p.booking_id))

  for (const booking of bookings) {
    const session: any = booking.live_session_id ? sessionById.get(booking.live_session_id) : null
    const happened = Boolean(session?.started_at)

    if (happened) {
      await supabase
        .from('session_bookings')
        .update({ status: 'completed', updated_at: now.toISOString() })
        .eq('id', booking.id)
        .in('status', ['scheduled', 'confirmed', 'active'])
      if (session.status !== 'completed') {
        await supabase
          .from('sessions')
          .update({ status: 'completed', ended_at: booking.scheduled_end_at })
          .eq('id', session.id)
          .in('status', ['scheduled', 'waiting', 'active'])
      }
      report.bookingsCompleted += 1
    } else if (paidBookingIds.has(booking.id)) {
      digest.unclearBookings.push({ id: booking.id, start: istanbulDateTime(booking.scheduled_start_at) })
    }
  }
}

// 4) Bir süredir seans almayan danışana bir kez "devam etmek ister misin"
async function reengageClients(supabase: any, now: Date, report: DailyReport) {
  const before = new Date(now.getTime() - AUTOMATION_TIMING.reengageAfterDays * DAY).toISOString()
  const { data: conversations, error } = await supabase
    .from('conversations')
    .select('id, client_application_id')
    .eq('status', 'active')
    .eq('payment_status', 'paid')
    .is('reengage_sent_at', null)
    .lt('updated_at', before)
    .limit(100)
  if (error) throw new Error(error.message)
  if (!conversations?.length) return

  const ids = conversations.map((c: any) => c.id)
  const { data: bookings } = await supabase
    .from('session_bookings')
    .select('conversation_id, status, scheduled_start_at')
    .in('conversation_id', ids)
    .neq('status', 'cancelled')

  const lastByConv = new Map<string, string>()
  const upcoming = new Set<string>()
  for (const b of bookings || []) {
    if (new Date(b.scheduled_start_at) > now) upcoming.add(b.conversation_id)
    const last = lastByConv.get(b.conversation_id)
    if (!last || b.scheduled_start_at > last) lastByConv.set(b.conversation_id, b.scheduled_start_at)
  }

  const appIds = conversations.map((c: any) => c.client_application_id)
  const { data: apps } = await supabase.from('client_applications').select('id, name, email, profession, status').in('id', appIds)
  const appById = new Map((apps || []).map((a: any) => [a.id, a]))

  for (const conv of conversations) {
    const last = lastByConv.get(conv.id)
    if (!last || upcoming.has(conv.id) || last > before) continue
    const app: any = appById.get(conv.client_application_id)
    if (!app?.email || app.status === 'cancelled') continue
    const link = await clientSessionsLink(conv.id)
    const mail = reengageText({ name: app.name, profession: app.profession, link })
    if (await safeSend(app.email, mail.subject, mail.text)) {
      await supabase.from('conversations').update({ reengage_sent_at: now.toISOString() }).eq('id', conv.id)
      report.reengaged += 1
    }
  }
}

// 5) Uzmanlar: eksik belge, takvim, ücret ve IBAN hatırlatmaları; onaya hazır olanlar admin özetine
async function remindExperts(supabase: any, now: Date, report: DailyReport, digest: AdminDigest) {
  const { data: experts, error } = await supabase
    .from('experts')
    .select('id, name, email, profession, status, account_type, session_price, iban, created_at, setup_reminder_sent_at, docs_reminder_sent_at, docs_reminder_count')
    .eq('status', 'approved')
    .neq('account_type', 'supervision_only')
    .limit(1000)
  if (error) throw new Error(error.message)
  if (!experts?.length) return

  const ids = experts.map((e: any) => e.id)
  const [documents, { data: schedules }] = await Promise.all([
    loadDocumentSummaries(supabase, experts),
    supabase.from('expert_availability').select('expert_id').eq('is_active', true).in('expert_id', ids),
  ])
  const withSchedule = new Set((schedules || []).map((s: any) => s.expert_id))

  for (const expert of experts) {
    const docs = documents.get(expert.id)
    if (!docs) continue
    const nowIso = now.toISOString()

    if (docs.verified) {
      // Belgeler tamam: danışan alabilmesi için takvim, ücret ve IBAN
      const missing: string[] = []
      if (!Number(expert.session_price)) missing.push('Profil sayfasında seans ücretini belirle')
      if (!withSchedule.has(expert.id)) missing.push('Takvim sayfasında haftalık müsait saatlerini aç')
      if (!isValidTrIban(expert.iban)) missing.push('Profil sayfasındaki "Ödeme bilgileri" bölümüne IBAN ekle')
      const due =
        !expert.setup_reminder_sent_at ||
        now.getTime() - new Date(expert.setup_reminder_sent_at).getTime() >= AUTOMATION_TIMING.expertSetupEveryDays * DAY
      if (missing.length && due) {
        const mail = expertSetupText({ name: expert.name, missing })
        if (await safeSend(expert.email, mail.subject, mail.text)) {
          await supabase.from('experts').update({ setup_reminder_sent_at: nowIso }).eq('id', expert.id)
          report.expertSetupReminders += 1
        }
      }
      continue
    }

    if (docs.readyForReview) {
      // Hepsi yüklendi, admin onayı bekliyor
      if (docs.pending.length) digest.readyForReview.push({ id: expert.id, name: expert.name })
      continue
    }

    const count = Number(expert.docs_reminder_count) || 0
    const due =
      count < AUTOMATION_TIMING.docsReminderMax &&
      hoursSince(expert.created_at, now) >= 24 &&
      (!expert.docs_reminder_sent_at ||
        now.getTime() - new Date(expert.docs_reminder_sent_at).getTime() >= AUTOMATION_TIMING.docsReminderEveryDays * DAY)
    if (due) {
      const mail = expertDocsText({
        name: expert.name,
        documents: docs.missing.map((d) => (d.status === 'rejected' ? `${d.title} (yeniden yüklenmeli)` : d.title)),
      })
      if (await safeSend(expert.email, mail.subject, mail.text)) {
        await supabase.from('experts').update({ docs_reminder_sent_at: nowIso, docs_reminder_count: count + 1 }).eq('id', expert.id)
        report.expertDocsReminders += 1
      }
    }
  }
}
