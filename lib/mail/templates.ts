export function clientMatchedTemplate({
  clientName,
  expertName,
}: {
  clientName: string
  expertName: string
}) {
  return `
Merhaba ${clientName},

Mindora üzerinden yaptığınız başvuru incelendi ve sizin için uygun bir uzman atandı.

Atanan uzman:
${expertName}

Güvenliğiniz ve sürecin sağlıklı ilerlemesi için iletişim Mindora üzerinden yürütülecektir.

Lütfen platform dışı iletişim kurmayınız.

Mindora ekibi
`
}

export function expertMatchedTemplate({
  expertName,
  clientName,
}: {
  expertName: string
  clientName: string
}) {
  return `
Merhaba ${expertName},

Mindora üzerinden size yeni bir danışan atanmıştır.

Danışan:
${clientName}

Gizlilik ve güvenlik politikamız gereği danışanın iletişim bilgileri paylaşılmamaktadır.

Lütfen tüm süreci Mindora üzerinden yürütünüz.

Platform dışı iletişim, ödeme ve güvenlik süreçlerini etkileyebilir.

Mindora ekibi
`
}

export function paymentSuccessClientTemplate({
  clientName,
  expertName,
}: {
  clientName: string
  expertName: string
}) {
  return `
Merhaba ${clientName},

Ödemeniz başarıyla alınmıştır.

Uzmanınız:
${expertName}

Süreç Mindora güvencesiyle devam edecektir.

Görüşme ve bilgilendirme adımları platform üzerinden yürütülecektir.

Mindora ekibi
`
}

export function paymentSuccessExpertTemplate({
  expertName,
  clientName,
}: {
  expertName: string
  clientName: string
}) {
  return `
Merhaba ${expertName},

Size atanmış danışan için ödeme başarıyla tamamlanmıştır.

Danışan:
${clientName}

Lütfen süreci Mindora üzerinden takip ediniz.

Mindora ekibi
`
}

export function bookingPreparedClientTemplate({
  clientName,
  expertName,
  scheduledStartText,
  scheduledEndText,
  chatUrl,
  sessionUrl,
}: {
  clientName: string
  expertName: string
  scheduledStartText: string
  scheduledEndText: string
  chatUrl: string
  sessionUrl: string
}) {
  return `
Merhaba ${clientName},

Mindora görüşme bağlantınız hazırlandı.

Uzmanınız:
${expertName}

Görüşme başlangıcı:
${scheduledStartText}

Görüşme bitişi:
${scheduledEndText}

Sohbet bağlantınız:
${chatUrl}

Video görüşme bağlantınız:
${sessionUrl}

Görüşme saatinden önce bağlantınızı, kameranızı ve mikrofonunuzu kontrol etmenizi öneririz.

Güvenliğiniz için görüşme ve iletişim sürecini Mindora dışına taşımayınız.

Mindora ekibi
`
}

export function bookingPreparedExpertTemplate({
  expertName,
  clientName,
  scheduledStartText,
  scheduledEndText,
  chatUrl,
  sessionUrl,
}: {
  expertName: string
  clientName: string
  scheduledStartText: string
  scheduledEndText: string
  chatUrl: string
  sessionUrl: string
}) {
  return `
Merhaba ${expertName},

Mindora üzerinden planlanan görüşmeniz hazırlandı.

Danışan:
${clientName}

Görüşme başlangıcı:
${scheduledStartText}

Görüşme bitişi:
${scheduledEndText}

Sohbet bağlantınız:
${chatUrl}

Video görüşme bağlantınız:
${sessionUrl}

Görüşme öncesinde danışan notlarını kontrol etmenizi, kamera ve mikrofon izinlerinizi test etmenizi öneririz.

Tüm süreci Mindora üzerinden yürütmeniz güvenlik, ödeme ve kayıt bütünlüğü açısından önemlidir.

Mindora ekibi
`
}
