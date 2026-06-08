import Link from "next/link";
import { notFound } from "next/navigation";

type PublicExpertProfile = {
  slug: string;
  name: string;
  title: string;
  imageInitials: string;
  specialties: string[];
  focusAreas: string[];
  education: string[];
  certificates: string[];
  experienceYears: number;
  sessionPrice: number;
  sessionDuration: string;
  rating: number;
  reviewCount: number;
  nextAvailableSlot: string;
  isAvailableThisWeek: boolean;
  bio: string;
  approach: string;
};

const expert: PublicExpertProfile = {
  slug: "demo-uzman",
  name: "Uzm. Psk. Elif Demir",
  title: "Klinik Psikolog",
  imageInitials: "ED",
  specialties: ["Kaygı", "Stres Yönetimi", "İlişkiler", "Özgüven"],
  focusAreas: [
    "Kaygı ve panik belirtileri",
    "İlişki problemleri",
    "Özgüven çalışmaları",
    "Yoğun stres ve tükenmişlik",
    "Duygu düzenleme",
    "Yaşam geçişleri",
  ],
  education: [
    "Psikoloji Lisans",
    "Klinik Psikoloji Yüksek Lisans",
  ],
  certificates: [
    "Bilişsel Davranışçı Terapi Eğitimi",
    "Kısa Süreli Çözüm Odaklı Terapi Eğitimi",
    "Online Terapi Etik ve Güvenlik Eğitimi",
  ],
  experienceYears: 6,
  sessionPrice: 1500,
  sessionDuration: "50 dk",
  rating: 4.9,
  reviewCount: 38,
  nextAvailableSlot: "Salı 18:00",
  isAvailableThisWeek: true,
  bio: "Danışanların günlük yaşamda zorlandıkları kaygı, stres, ilişki ve özgüven konularında güvenli, yapılandırılmış ve destekleyici bir terapi süreci sunar.",
  approach:
    "Görüşmelerde danışanın ihtiyacına göre hedef odaklı ilerlenir. İlk seansta ihtiyaçlar netleştirilir, ardından kişiye özel çalışma planı oluşturulur.",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PublicExpertProfilePage({
  params,
}: {
  params: { slug: string };
}) {
  if (!params.slug) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-14">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-indigo-100 text-3xl font-black text-indigo-700 ring-1 ring-indigo-200">
              {expert.imageInitials}
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                  {expert.isAvailableThisWeek ? "Bu hafta uygun" : "Yakında uygun"}
                </span>
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                  Online görüşme
                </span>
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {expert.name}
              </h1>
              <p className="mt-2 text-base font-semibold text-slate-600">
                {expert.title} • {expert.experienceYears} yıl deneyim
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600">
                <span>⭐ {expert.rating.toFixed(1)}</span>
                <span className="text-slate-300">•</span>
                <span>{expert.reviewCount} danışan yorumu</span>
                <span className="text-slate-300">•</span>
                <span>İlk uygun seans: {expert.nextAvailableSlot}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {expert.specialties.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm lg:max-w-sm">
            <p className="text-sm font-semibold text-slate-500">Seans ücreti</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {formatMoney(expert.sessionPrice)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {expert.sessionDuration} online görüşme
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/eslesme"
                className="flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
              >
                Randevu Talep Et
              </Link>
              <Link
                href="/uzmanlar"
                className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100"
              >
                Diğer Uzmanları Gör
              </Link>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Mindora acil kriz hattı değildir. Kendinize veya bir başkasına zarar verme riski varsa 112 ile iletişime geçin.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          <InfoCard title="Hakkında">
            <p className="text-sm leading-7 text-slate-600">{expert.bio}</p>
          </InfoCard>

          <InfoCard title="Çalışma Yaklaşımı">
            <p className="text-sm leading-7 text-slate-600">{expert.approach}</p>
          </InfoCard>

          <InfoCard title="Çalıştığı Konular">
            <div className="grid gap-3 sm:grid-cols-2">
              {expert.focusAreas.map((area) => (
                <div
                  key={area}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700"
                >
                  {area}
                </div>
              ))}
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard title="Eğitim">
            <List items={expert.education} />
          </InfoCard>

          <InfoCard title="Sertifikalar">
            <List items={expert.certificates} />
          </InfoCard>

          <InfoCard title="Müsaitlik Özeti">
            <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-sm font-bold text-emerald-800">
                {expert.isAvailableThisWeek ? "Bu hafta seans alınabilir" : "Şu an sınırlı müsaitlik"}
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                İlk uygun saat: {expert.nextAvailableSlot}
              </p>
            </div>
          </InfoCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-indigo-600 p-8 text-white shadow-sm sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">
                Bu uzmanla görüşmek ister misiniz?
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Kısa eşleşme formunu doldurun. Mindora ekibi ihtiyacınıza göre sizi uygun uzman ve seans akışıyla yönlendirsin.
              </p>
            </div>

            <Link
              href="/eslesme"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50"
            >
              Eşleşme Formuna Git
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-slate-600">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
