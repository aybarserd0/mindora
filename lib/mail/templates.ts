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