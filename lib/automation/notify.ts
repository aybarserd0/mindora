/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase istemcisi yeni sütunlarla birlikte gevşek tipli kullanılıyor (mevcut rotalardaki gibi) */
import { sendMail } from '@/lib/mail/smtp'
import { getSiteUrl } from '@/lib/site-url'
import { createConversationAccessToken } from '@/lib/chat-access-tokens'
import { PROFESSION_CONFIG, toProfession } from '@/lib/professions'

const SIGNOFF = `
Mindora

Mindora acil durum hizmeti değildir. Kendine veya bir başkasına zarar verme riski varsa 112'yi ara.`

/** E-posta gönderimi hiçbir otomasyonu durdurmasın: hata loglanır, false döner. */
export async function safeSend(to: string | null | undefined, subject: string, text: string) {
  const receiver = String(to || '').trim()
  if (!receiver) return false
  try {
    await sendMail({ to: receiver, subject, text })
    return true
  } catch (error) {
    console.error('AUTOMATION_MAIL_ERROR', subject, error)
    return false
  }
}

function adminAddress() {
  return process.env.CONTACT_TO || process.env.ADMIN_NOTIFICATION_EMAIL || ''
}

function money(value: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value)
}

/** Danışanın tek tıkla seans sayfasına girebileceği 30 günlük bağlantı */
export async function clientSessionsLink(conversationId: string) {
  const base = getSiteUrl()
  try {
    const { token } = await createConversationAccessToken({ conversationId, role: 'client', expiresInHours: 24 * 30 })
    return `${base}/client/dashboard/sessions?token=${token}`
  } catch (error) {
    console.error('AUTOMATION_ACCESS_TOKEN_ERROR', error)
    return `${base}/danisan-girisi`
  }
}

// ---------- Danışan ----------

export function unpaidReminderText({ name, profession, link }: { name: string; profession: unknown; link: string }) {
  const p = PROFESSION_CONFIG[toProfession(profession)]
  return {
    subject: `${p.yourWith} ilk görüşmeni planlamadın`,
    text: `Merhaba ${name},

Birkaç gün önce seni ${p.label.toLocaleLowerCase('tr-TR')} ile eşleştirmiştik ama henüz bir saat seçmedin. Acele yok; hazır olduğunda aşağıdaki bağlantıdan boş saatlere bakabilirsin:

${link}

Eşleştiğin uzman sana uymuyor gibi hissediyorsan bu e-postayı yanıtlaman yeterli; başka birini önerelim.
${SIGNOFF}`,
  }
}

export function waitingNoticeText({ name, profession }: { name: string; profession: unknown }) {
  const p = PROFESSION_CONFIG[toProfession(profession)]
  return {
    subject: `Sana uygun ${p.accusative} arıyoruz`,
    text: `Merhaba ${name},

Başvurun bizde. Şu an anlattıklarına ve saatlerine tam uyan bir ${p.label.toLocaleLowerCase('tr-TR')} için yer açılmasını bekliyoruz. Uygun biri olur olmaz saat seçebileceğin bağlantıyı bu adrese göndereceğiz.

Saatlerin ya da tercihlerin değiştiyse bu e-postayı yanıtlayarak bize yazabilirsin.
${SIGNOFF}`,
  }
}

export function reengageText({ name, profession, link }: { name: string; profession: unknown; link: string }) {
  const p = PROFESSION_CONFIG[toProfession(profession)]
  return {
    subject: 'Nasıl gidiyor?',
    text: `Merhaba ${name},

Son görüşmenin üzerinden birkaç hafta geçti. Kaldığın yerden devam etmek istersen ${p.yourOf} boş saatlerine buradan bakabilirsin:

${link}

İhtiyacın değiştiyse ya da ara vermek istiyorsan hiçbir şey yapmana gerek yok. Bu hatırlatmayı yalnızca bir kez gönderiyoruz.
${SIGNOFF}`,
  }
}

// ---------- Uzman ----------

export function expertSetupText({ name, missing }: { name: string; missing: string[] }) {
  const base = getSiteUrl()
  return {
    subject: 'Danışan alabilmen için birkaç adım kaldı',
    text: `Merhaba ${name},

Mindora danışanları otomatik olarak uygun uzmanlarla eşleştiriyor. Sana da danışan gelebilmesi için şunları tamamlaman gerekiyor:

${missing.map((m) => `• ${m}`).join('\n')}

Uzman alanına giriş: ${base}/expert/login

Mindora`,
  }
}

export function expertDocsText({ name, documents }: { name: string; documents: string[] }) {
  const base = getSiteUrl()
  return {
    subject: 'Belgelerin eksik görünüyor',
    text: `Merhaba ${name},

Profilinin doğrulanması ve sana danışan gelmeye başlaması için şu belgeleri yüklemen gerekiyor:

${documents.map((d) => `• ${d}`).join('\n')}

Belgeleri uzman alanındaki "Doğrulama" sayfasından yükleyebilirsin: ${base}/expert/dashboard/verification
Reddedilen bir belge varsa, açıklamasını aynı sayfada görebilirsin.

Mindora`,
  }
}

export function expertMissingIbanText({ name, amount }: { name: string; amount: number }) {
  const base = getSiteUrl()
  return {
    subject: 'Hakedişini gönderebilmemiz için IBAN gerekli',
    text: `Merhaba ${name},

Tamamlanan seanslarından ${money(amount)} hakedişin hazır, ama profilinde geçerli bir IBAN olmadığı için gönderemedik.

Profil sayfandaki "Ödeme bilgileri" bölümüne IBAN'ını ekleyebilirsin: ${base}/expert/dashboard/profile
Eklediğin hafta hakedişin bir sonraki ödeme gününde gönderilir.

Mindora`,
  }
}

export async function notifyExpertPayoutPaid(supabase: any, payoutId: string) {
  const { data: payout } = await supabase.from('expert_payouts').select('id, expert_id, amount, period_key').eq('id', payoutId).maybeSingle()
  if (!payout) return false
  const { data: expert } = await supabase.from('experts').select('name, email').eq('id', payout.expert_id).maybeSingle()
  if (!expert?.email) return false
  const base = getSiteUrl()
  return safeSend(
    expert.email,
    'Hakedişin gönderildi',
    `Merhaba ${expert.name || ''},

${payout.period_key ? `${payout.period_key} haftasına ait ` : ''}${money(Number(payout.amount))} hakedişin hesabına gönderildi. Bankana göre hesaba geçmesi 1 iş gününü bulabilir.

Seans bazında dökümü kazançlar sayfasında görebilirsin: ${base}/expert/dashboard/earnings

Mindora`
  )
}

// ---------- Admin ----------

export type AdminDigest = {
  unmatched: { id: string; name: string; profession: string; hours: number }[]
  readyForReview: { id: string; name: string }[]
  unclearBookings: { id: string; start: string }[]
  payouts: { created: { name: string; amount: number }[]; missingIban: { name: string; amount: number }[] } | null
  stats: { autoMatched: number; completedBookings: number; remindersSent: number }
}

export function adminDigestText(d: AdminDigest) {
  const base = getSiteUrl()
  const lines: string[] = ['Mindora günlük otomasyon özeti', '']

  lines.push(
    `Bugün sistem: ${d.stats.autoMatched} danışanı eşleştirdi, ${d.stats.completedBookings} seansı tamamlandı olarak kapattı, ${d.stats.remindersSent} hatırlatma gönderdi.`,
    ''
  )

  if (d.unmatched.length) {
    lines.push(`Uygun uzman bulunamayan başvurular (${d.unmatched.length}) — elle eşleştir: ${base}/admin/danisan-basvurulari`)
    for (const u of d.unmatched.slice(0, 20)) lines.push(`• ${u.name} · ${PROFESSION_CONFIG[toProfession(u.profession)].label} · ${u.hours} saattir bekliyor`)
    lines.push('')
  }

  if (d.readyForReview.length) {
    lines.push(`Belgeleri tamam, onayını bekleyen uzmanlar (${d.readyForReview.length}): ${base}/admin/expert-verifications`)
    for (const e of d.readyForReview.slice(0, 20)) lines.push(`• ${e.name}`)
    lines.push('')
  }

  if (d.unclearBookings.length) {
    lines.push(`Saati geçtiği hâlde kimsenin katılmadığı görünen seanslar (${d.unclearBookings.length}). Ödeme bunlar için bekletiliyor; danışan ve uzmanla konuşup durumu belirle:`)
    for (const b of d.unclearBookings.slice(0, 20)) lines.push(`• ${b.start} · ${base}/admin/payments`)
    lines.push('')
  }

  if (d.payouts) {
    if (d.payouts.created.length) {
      const total = d.payouts.created.reduce((s, p) => s + p.amount, 0)
      lines.push(`Bu haftanın hakedişleri hazır: ${d.payouts.created.length} uzman, toplam ${money(total)}. IBAN'lar ve "Ödendi" butonu: ${base}/admin/payouts`)
      for (const p of d.payouts.created) lines.push(`• ${p.name}: ${money(p.amount)}`)
      lines.push('')
    }
    if (d.payouts.missingIban.length) {
      lines.push('IBAN eksik olduğu için bekleyen hakedişler (uzmana e-posta gitti):')
      for (const p of d.payouts.missingIban) lines.push(`• ${p.name}: ${money(p.amount)}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

export function digestHasActions(d: AdminDigest) {
  return Boolean(
    d.unmatched.length ||
      d.readyForReview.length ||
      d.unclearBookings.length ||
      d.payouts?.created.length ||
      d.payouts?.missingIban.length
  )
}

export async function sendAdminDigest(d: AdminDigest) {
  if (!digestHasActions(d)) return false
  return safeSend(adminAddress(), 'Mindora günlük özet: yapılacaklar', adminDigestText(d))
}
