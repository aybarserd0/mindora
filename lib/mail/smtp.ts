import nodemailer from 'nodemailer'

type SendMailParams = {
  to: string | string[]
  subject: string
  text: string
  html?: string
  replyTo?: string
}

const smtpHost = process.env.SMTP_HOST?.trim()
const smtpPort = Number(process.env.SMTP_PORT || 587)
const smtpUser = process.env.SMTP_USER?.trim()
const smtpPass = process.env.SMTP_PASS
const smtpSecure = process.env.SMTP_SECURE === 'true'

function getMailFrom() {
  return (
    process.env.SMTP_FROM?.trim() ||
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    ''
  )
}

function assertSmtpConfig() {
  if (!smtpHost) {
    throw new Error('[Mindora Mail] SMTP_HOST env bilgisi eksik.')
  }

  if (!Number.isInteger(smtpPort) || smtpPort <= 0) {
    throw new Error('[Mindora Mail] SMTP_PORT geçerli değil.')
  }

  if (!smtpUser) {
    throw new Error('[Mindora Mail] SMTP_USER env bilgisi eksik.')
  }

  if (!smtpPass) {
    throw new Error('[Mindora Mail] SMTP_PASS env bilgisi eksik.')
  }

  if (!getMailFrom()) {
    throw new Error('[Mindora Mail] SMTP_FROM veya MAIL_FROM env bilgisi eksik.')
  }
}

function normalizeRecipients(to: string | string[]) {
  const recipients = Array.isArray(to) ? to : [to]

  return recipients
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function normalizeSubject(subject: string) {
  return String(subject || '').trim().slice(0, 180)
}

function normalizeText(text: string) {
  return String(text || '').trim()
}

function textToHtml(text: string) {
  const escaped = normalizeText(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `
<!doctype html>
<html lang="tr">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mindora</title>
  </head>
  <body style="margin:0;background:#f7f2eb;color:#171717;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="background:#f7f2eb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);">
            <tr>
              <td style="background:#111111;color:#ffffff;padding:24px 28px;">
                <div style="font-size:20px;font-weight:900;letter-spacing:-0.02em;">Mindora</div>
                <div style="margin-top:6px;font-size:13px;color:rgba(255,255,255,0.68);">Online psikolojik destek platformu</div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="white-space:pre-line;font-size:15px;line-height:1.75;color:#333333;">${escaped}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#fafafa;color:#777777;font-size:12px;line-height:1.6;">
                Bu e-posta Mindora işlem ve bilgilendirme süreci kapsamında gönderilmiştir.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

export const smtpTransport = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: smtpUser && smtpPass
    ? {
        user: smtpUser,
        pass: smtpPass,
      }
    : undefined,
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
})

export async function verifyMailTransport() {
  assertSmtpConfig()
  return smtpTransport.verify()
}

export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo,
}: SendMailParams) {
  assertSmtpConfig()

  const recipients = normalizeRecipients(to)
  const safeSubject = normalizeSubject(subject)
  const safeText = normalizeText(text)

  if (recipients.length === 0) {
    throw new Error('[Mindora Mail] En az bir alıcı e-posta adresi gerekli.')
  }

  if (!safeSubject) {
    throw new Error('[Mindora Mail] E-posta konusu boş olamaz.')
  }

  if (!safeText && !html) {
    throw new Error('[Mindora Mail] E-posta içeriği boş olamaz.')
  }

  return smtpTransport.sendMail({
    from: getMailFrom(),
    to: recipients.join(', '),
    subject: safeSubject,
    text: safeText,
    html: html || textToHtml(safeText),
    replyTo: replyTo?.trim() || undefined,
    headers: {
      'X-Mindora-Mail': 'transactional',
    },
  })
}
