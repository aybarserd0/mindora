type MatchTemplateParams = {
  clientName: string
  expertName: string
}

type PaymentTemplateParams = {
  clientName: string
  expertName: string
}

type BookingPreparedTemplateParams = {
  clientName: string
  expertName: string
  scheduledStartText: string
  scheduledEndText: string
  chatUrl: string
  sessionUrl: string
}

type SessionReminderTemplateParams = {
  recipientName: string
  otherPartyName: string
  scheduledStartText: string
  sessionUrl: string
  chatUrl?: string
  reminderLabel: string
}

type ReviewRequestTemplateParams = {
  clientName: string
  expertName: string
  reviewUrl: string
}

type ApplicationReceivedTemplateParams = {
  name: string
}

type ExpertApplicationReceivedTemplateParams = {
  expertName: string
}

type ExpertApplicationDecisionTemplateParams = {
  expertName: string
  loginUrl?: string
}

type ClientApplicationCancelledTemplateParams = {
  clientName: string
}

type PaymentFailedTemplateParams = {
  clientName: string
}

type ExpertVerificationDecisionTemplateParams = {
  expertName: string
  documentLabel: string
  adminNote?: string
}

type BookingCancelledTemplateParams = {
  recipientName: string
  otherPartyName: string
  scheduledStartText: string
  cancellationReason?: string
}

type ExpertLoginLinkTemplateParams = {
  expertName: string
  loginUrl: string
}

const brandName = 'Mindora'
const emergencyNotice =
  'Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa lütfen 112 ile iletişime geç ya da en yakın sağlık kuruluşuna başvur.'

function cleanText(value: string | null | undefined, fallback = 'Mindora kullanıcısı') {
  const text = String(value || '').trim()
  return text || fallback
}

function footer() {
  return `
Gizlilik ve güvenlik için iletişim, ödeme ve görüşme süreçlerini Mindora dışına taşımamanızı öneririz.

${emergencyNotice}

${brandName} ekibi
`
}

function divider() {
  return '----------------------------------------'
}

export function clientApplicationReceivedTemplate({ name }: ApplicationReceivedTemplateParams) {
  const safeName = cleanText(name, 'Merhaba')

  return `
Merhaba ${safeName},

Mindora ön eşleşme başvurunuz başarıyla alındı.

Başvurunuz; destek almak istediğiniz konu, beklentiniz ve uygun zaman bilginiz dikkate alınarak değerlendirilecektir.

Süreç nasıl ilerler?
${divider()}
1. Başvurunuz Mindora ekibi tarafından incelenir.
2. Size uygun başlangıç için uzman ve süreç değerlendirmesi yapılır.
3. Uygun eşleşme ve sonraki adımlar hakkında bilgilendirilirsiniz.

Ön eşleşme ücretsizdir ve seans satın alma zorunluluğu oluşturmaz.

${footer()}
`
}

export function expertApplicationReceivedTemplate({
  expertName,
}: ExpertApplicationReceivedTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')

  return `
Merhaba ${safeExpertName},

Mindora uzman başvurunuz başarıyla alındı.

Başvurunuz; uzmanlık bilgileriniz, çalışma alanlarınız ve platform uygunluğu açısından değerlendirilecektir.

Süreç nasıl ilerler?
${divider()}
1. Başvuru bilgileriniz incelenir.
2. Gerekirse ek belge veya bilgi talep edilir.
3. Uygun bulunması halinde Mindora uzman ağına katılım süreciniz başlatılır.

Başvuru yapmak ücretsizdir.

${footer()}
`
}

export function expertApplicationApprovedTemplate({
  expertName,
  loginUrl,
}: ExpertApplicationDecisionTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')

  return `
Merhaba ${safeExpertName},

Mindora uzman başvurunuz onaylandı. Aramıza hoş geldiniz!

${loginUrl ? `Uzman panelinize giriş bağlantınız:\n${loginUrl}\n\nBu bağlantı size özeldir, kimseyle paylaşmayın.\n` : ''}
Sonraki adımlar:
${divider()}
1. Uzman panelinize giriş yaparak profilinizi tamamlayabilirsiniz.
2. Kimlik/diploma doğrulama belgelerinizi yükleyerek hesabınızı tam yetkili hale getirebilirsiniz.
3. Uygunluk takviminizi oluşturduğunuzda danışan eşleştirmeleri başlayabilir.

${footer()}
`
}

export function expertApplicationRejectedTemplate({
  expertName,
}: ExpertApplicationDecisionTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')

  return `
Merhaba ${safeExpertName},

Mindora uzman başvurunuzu değerlendirdik; bu aşamada başvurunuzu onaylayamadık.

Bu karar; platform uygunluk kriterleri veya sağlanan bilgi/belgelerin yeterliliği doğrultusunda verilmiştir. Eksik gördüğünüz bir bilgi varsa yeniden başvuru yapabilirsiniz.

${footer()}
`
}

export function clientApplicationCancelledTemplate({
  clientName,
}: ClientApplicationCancelledTemplateParams) {
  const safeClientName = cleanText(clientName, 'Merhaba')

  return `
Merhaba ${safeClientName},

Mindora üzerinden yaptığınız başvuru bu aşamada sonlandırılmıştır.

Destek almak isterseniz dilediğiniz zaman yeni bir ön eşleşme başvurusu yapabilirsiniz.

${footer()}
`
}

export function paymentFailedClientTemplate({
  clientName,
}: PaymentFailedTemplateParams) {
  const safeClientName = cleanText(clientName, 'Merhaba')

  return `
Merhaba ${safeClientName},

Mindora üzerinden başlattığınız ödeme işlemi tamamlanamadı.

Kartınızdan herhangi bir tutar çekilmediyse işlem hiç gerçekleşmemiştir; çekildiyse banka/kart kuruluşunuz genellikle bu tutarı otomatik olarak iade eder.

Ne yapabilirsiniz?
${divider()}
1. Kart bilgilerinizi ve bakiyenizi kontrol ederek tekrar deneyebilirsiniz.
2. Sorun devam ederse farklı bir kart ile tekrar deneyebilirsiniz.
3. Yardıma ihtiyacınız olursa Mindora destek ekibiyle iletişime geçebilirsiniz.

${footer()}
`
}

export function expertVerificationApprovedTemplate({
  expertName,
  documentLabel,
}: ExpertVerificationDecisionTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')

  return `
Merhaba ${safeExpertName},

${documentLabel} belgeniz incelendi ve onaylandı.

${footer()}
`
}

export function expertVerificationRejectedTemplate({
  expertName,
  documentLabel,
  adminNote,
}: ExpertVerificationDecisionTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')
  const safeNote = cleanText(adminNote, '')

  return `
Merhaba ${safeExpertName},

${documentLabel} belgeniz incelendi ve bu aşamada onaylanamadı.
${safeNote ? `\nGerekçe: ${safeNote}\n` : ''}
Lütfen belgeyi kontrol ederek uzman panelinizden yeniden yükleyin.

${footer()}
`
}

export function bookingCancelledTemplate({
  recipientName,
  otherPartyName,
  scheduledStartText,
  cancellationReason,
}: BookingCancelledTemplateParams) {
  const safeRecipientName = cleanText(recipientName, 'Merhaba')
  const safeOtherPartyName = cleanText(otherPartyName, 'Mindora kullanıcısı')
  const safeReason = cleanText(cancellationReason, '')

  return `
Merhaba ${safeRecipientName},

${safeOtherPartyName} ile ${scheduledStartText} tarihine planlanan Mindora seansınız iptal edilmiştir.
${safeReason ? `\nİptal nedeni: ${safeReason}\n` : ''}
Yeni bir randevu planlamak için Mindora panelinizi ziyaret edebilirsiniz.

${footer()}
`
}

export function expertLoginLinkTemplate({ expertName, loginUrl }: ExpertLoginLinkTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')

  return `
Merhaba ${safeExpertName},

Mindora uzman panelinize giriş bağlantınız aşağıdadır. Bu bağlantı size özeldir, kimseyle paylaşmayın.

${loginUrl}

Bağlantı 30 gün geçerlidir. Talep etmediyseniz bu e-postayı yok sayabilirsiniz.

${footer()}
`
}

export function clientMatchedTemplate({ clientName, expertName }: MatchTemplateParams) {
  const safeClientName = cleanText(clientName, 'Merhaba')
  const safeExpertName = cleanText(expertName, 'Mindora uzmanı')

  return `
Merhaba ${safeClientName},

Mindora üzerinden yaptığınız başvuru incelendi ve sizin için uygun bir uzman eşleşmesi yapıldı.

Atanan uzman:
${safeExpertName}

Sonraki adımlar:
${divider()}
1. Süreç bilgileri Mindora üzerinden paylaşılır.
2. Randevu ve ödeme adımları güvenli şekilde tamamlanır.
3. Görüşme bağlantısı seans planlandıktan sonra size iletilir.

Platform dışı iletişim, ödeme ve görüşme süreçleri güvenlik açısından önerilmez.

${footer()}
`
}

export function expertMatchedTemplate({ expertName, clientName }: MatchTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')
  const safeClientName = cleanText(clientName, 'Mindora danışanı')

  return `
Merhaba ${safeExpertName},

Mindora üzerinden size yeni bir danışan atanmıştır.

Danışan:
${safeClientName}

Lütfen süreci Mindora paneliniz üzerinden takip ediniz.

Önemli notlar:
${divider()}
- Danışanın kişisel iletişim bilgileri güvenlik ve gizlilik nedeniyle paylaşılmaz.
- Görüşme, ödeme ve bilgilendirme adımları Mindora üzerinden yürütülmelidir.
- Seans planlandığında görüşme bağlantısı ayrıca iletilecektir.

${footer()}
`
}

export function paymentSuccessClientTemplate({
  clientName,
  expertName,
}: PaymentTemplateParams) {
  const safeClientName = cleanText(clientName, 'Merhaba')
  const safeExpertName = cleanText(expertName, 'Mindora uzmanı')

  return `
Merhaba ${safeClientName},

Ödemeniz başarıyla alınmıştır.

Uzmanınız:
${safeExpertName}

Süreç Mindora güvencesiyle devam edecektir.

Sonraki adımlar:
${divider()}
1. Randevu planlaması tamamlanır.
2. Seans bağlantınız size e-posta ile iletilir.
3. Görüşme saatinden önce kamera ve mikrofonunuzu kontrol etmeniz önerilir.

${footer()}
`
}

export function paymentSuccessExpertTemplate({
  expertName,
  clientName,
}: PaymentTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')
  const safeClientName = cleanText(clientName, 'Mindora danışanı')

  return `
Merhaba ${safeExpertName},

Size atanmış danışan için ödeme başarıyla tamamlanmıştır.

Danışan:
${safeClientName}

Lütfen randevu ve görüşme sürecini Mindora paneliniz üzerinden takip ediniz.

Seans bağlantısı planlama tamamlandıktan sonra ayrıca iletilecektir.

${footer()}
`
}

export function bookingPreparedClientTemplate({
  clientName,
  expertName,
  scheduledStartText,
  scheduledEndText,
  chatUrl,
  sessionUrl,
}: BookingPreparedTemplateParams) {
  const safeClientName = cleanText(clientName, 'Merhaba')
  const safeExpertName = cleanText(expertName, 'Mindora uzmanı')

  return `
Merhaba ${safeClientName},

Mindora seansınız planlandı ve görüşme bağlantınız hazırlandı.

Seans bilgileri:
${divider()}
Uzman: ${safeExpertName}
Başlangıç: ${scheduledStartText}
Bitiş: ${scheduledEndText}

Video görüşme bağlantınız:
${sessionUrl}

Sohbet bağlantınız:
${chatUrl}

Görüşme öncesi öneriler:
${divider()}
- Seans saatinden birkaç dakika önce bağlantıyı açın.
- Kamera ve mikrofon izinlerinizi kontrol edin.
- İnternet bağlantınızın stabil olduğundan emin olun.
- Sessiz ve güvenli bir ortamda görüşmeye katılın.

${footer()}
`
}

export function bookingPreparedExpertTemplate({
  expertName,
  clientName,
  scheduledStartText,
  scheduledEndText,
  chatUrl,
  sessionUrl,
}: BookingPreparedTemplateParams) {
  const safeExpertName = cleanText(expertName, 'Merhaba')
  const safeClientName = cleanText(clientName, 'Mindora danışanı')

  return `
Merhaba ${safeExpertName},

Mindora üzerinden planlanan yeni seansınız hazırlandı.

Seans bilgileri:
${divider()}
Danışan: ${safeClientName}
Başlangıç: ${scheduledStartText}
Bitiş: ${scheduledEndText}

Video görüşme bağlantınız:
${sessionUrl}

Sohbet bağlantınız:
${chatUrl}

Görüşme öncesi öneriler:
${divider()}
- Seans saatinden önce danışan notlarını kontrol edin.
- Kamera ve mikrofon izinlerinizi test edin.
- Görüşme sürecini Mindora dışına taşımayın.
- Teknik bir problem olursa destek sürecini Mindora üzerinden yönetin.

${footer()}
`
}

export function sessionReminderClientTemplate({
  recipientName,
  otherPartyName,
  scheduledStartText,
  sessionUrl,
  chatUrl,
  reminderLabel,
}: SessionReminderTemplateParams) {
  const safeRecipientName = cleanText(recipientName, 'Merhaba')
  const safeExpertName = cleanText(otherPartyName, 'Mindora uzmanı')

  return `
Merhaba ${safeRecipientName},

${reminderLabel} Mindora seansınız bulunmaktadır.

Seans bilgileri:
${divider()}
Uzman: ${safeExpertName}
Başlangıç: ${scheduledStartText}

Video görüşme bağlantınız:
${sessionUrl}

${chatUrl ? `Sohbet bağlantınız:\n${chatUrl}\n` : ''}

Lütfen görüşme saatinden önce kamera, mikrofon ve internet bağlantınızı kontrol edin.

${footer()}
`
}

export function sessionReminderExpertTemplate({
  recipientName,
  otherPartyName,
  scheduledStartText,
  sessionUrl,
  chatUrl,
  reminderLabel,
}: SessionReminderTemplateParams) {
  const safeExpertName = cleanText(recipientName, 'Merhaba')
  const safeClientName = cleanText(otherPartyName, 'Mindora danışanı')

  return `
Merhaba ${safeExpertName},

${reminderLabel} Mindora seansınız bulunmaktadır.

Seans bilgileri:
${divider()}
Danışan: ${safeClientName}
Başlangıç: ${scheduledStartText}

Video görüşme bağlantınız:
${sessionUrl}

${chatUrl ? `Sohbet bağlantınız:\n${chatUrl}\n` : ''}

Lütfen görüşme saatinden önce danışan notlarını, kamera ve mikrofon izinlerinizi kontrol edin.

${footer()}
`
}

export function reviewRequestClientTemplate({
  clientName,
  expertName,
  reviewUrl,
}: ReviewRequestTemplateParams) {
  const safeClientName = cleanText(clientName, 'Merhaba')
  const safeExpertName = cleanText(expertName, 'Mindora uzmanı')

  return `
Merhaba ${safeClientName},

Mindora seansınız tamamlandıysa deneyiminizi değerlendirmenizi isteriz.

Uzman:
${safeExpertName}

Değerlendirme bağlantısı:
${reviewUrl}

Yorumunuz, yalnızca moderasyon sürecinden sonra yayınlanır. Amacımız hem danışan deneyimini iyileştirmek hem de platformdaki güvenli süreci korumaktır.

${footer()}
`
}
