import Header from "@/components/Header";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ExpertRow = {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  areas?: string | null;
  specialties?: string[] | string | null;
  focus_areas?: string[] | string | null;
  experience?: string | null;
  experience_years?: number | string | null;
  online?: string | null;
  price?: string | null;
  session_price?: number | string | null;
  session_duration_minutes?: number | string | null;
  availability?: string | null;
  expectation?: string | null;
  note?: string | null;
  bio?: string | null;
  public_bio?: string | null;
  therapy_approach?: string | null;
  approach?: string | null;
  education?: string[] | string | null;
  certificates?: string[] | string | null;
  status?: string | null;
  account_status?: string | null;
  photo_url?: string | null;
  profile_image_url?: string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  ranking_score?: number | string | null;
  city?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ReviewRow = {
  id: string;
  expert_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
};

type PublicReview = {
  id: string;
  rating: number;
  reviewText: string;
  createdAt: string;
};

type PublicExpertProfile = {
  id: string;
  slug: string;
  name: string;
  title: string;
  imageInitials: string;
  profileImageUrl: string | null;
  areas: string[];
  education: string[];
  certificates: string[];
  experience: string;
  experienceYears: number;
  city: string;
  onlineText: string;
  availabilityText: string;
  priceText: string;
  sessionPrice: number;
  sessionDurationMinutes: number;
  bio: string;
  approach: string;
  isOnlineAvailable: boolean;
  averageRating: number;
  reviewCount: number;
  rankingScore: number;
  createdAt: string | null;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://mindora.live";

const DEFAULT_DESCRIPTION =
  "Mindora ile online psikolojik destek sürecine güvenli, sade ve uygun uzman eşleşmesiyle başlayın.";

const DEFAULT_SUPPORT_AREAS = [
  "Kaygı ve stres",
  "İlişki problemleri",
  "Özgüven",
  "Depresif duygu durumu",
  "Aile içi iletişim",
  "Sınav ve gelecek kaygısı",
];

const TRUST_BADGES = [
  "Mindora onaylı profil",
  "Tamamlanan seans sonrası yorum",
  "Güvenli ödeme akışı",
  "Online görüşme süreci",
];

const PROCESS_STEPS = [
  "Kısa ön eşleşme formunu doldur",
  "İhtiyacına ve uygun zamanına göre süreç netleşsin",
  "Randevu, ödeme ve görüşme adımlarını güvenli şekilde tamamla",
];

const FAQ_ITEMS = [
  {
    question: "Online psikolojik danışmanlık seansı nasıl ilerler?",
    answer:
      "Ön eşleşme formu sonrasında uygun uzman, randevu zamanı ve görüşme süreci netleştirilir. Görüşme Mindora içindeki güvenli online görüşme akışıyla gerçekleştirilir.",
  },
  {
    question: "İlk görüşmede ne konuşulur?",
    answer:
      "İlk görüşmede destek ihtiyacınız, beklentiniz, geçmiş deneyimleriniz ve uygun süreç planı değerlendirilir. Amaç, size en doğru başlangıç yolunu oluşturmaktır.",
  },
  {
    question: "Seans süresi ne kadardır?",
    answer:
      "Mindora’da standart online görüşmeler genellikle 50 dakika olarak planlanır. Uzmanın çalışma düzenine göre süre ve müsaitlik bilgisi ön eşleşme sonrasında netleşebilir.",
  },
  {
    question: "Yorumlar nasıl yayınlanır?",
    answer:
      "Yorumlar yalnızca tamamlanan seanslardan sonra alınır ve yayınlanmadan önce Mindora moderasyon sürecinden geçirilir.",
  },
];

function toText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const normalized = String(value)
    .replace(/\s/g, "")
    .replace(/[₺TLtl]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampRating(value: unknown) {
  const rating = toNumber(value, 0);
  if (rating < 0) return 0;
  if (rating > 5) return 5;
  return rating;
}

function isSafeSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value.trim());
}

function createSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function absoluteUrl(path: string) {
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return path;
  }
}

function isValidImageUrl(value: string | null) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]?.charAt(0).toLocaleUpperCase("tr-TR") || "M";

  const first = parts[0]?.charAt(0) || "M";
  const last = parts[parts.length - 1]?.charAt(0) || "";

  return `${first}${last}`.toLocaleUpperCase("tr-TR");
}

function splitTextList(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  const text = toText(value);
  if (!text) return [];

  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "Eşleşme sonrası netleşir";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function hasRealProfileImage(expert: PublicExpertProfile) {
  return Boolean(expert.profileImageUrl);
}

function getPrimaryArea(expert: PublicExpertProfile) {
  return expert.areas[0] || "Online psikolojik destek";
}

function getRatingText(expert: PublicExpertProfile) {
  if (expert.reviewCount > 0 && expert.averageRating > 0) {
    return `★ ${expert.averageRating.toFixed(1)} · ${expert.reviewCount} değerlendirme`;
  }

  return "Yeni değerlendirme";
}

function getEducationPreview(expert: PublicExpertProfile) {
  return expert.education[0] || "Eğitim bilgisi ön eşleşme sürecinde netleşir.";
}

function getCertificatePreview(expert: PublicExpertProfile) {
  return expert.certificates[0] || "Sertifika bilgisi ön eşleşme sürecinde netleşir.";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih bilinmiyor";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih bilinmiyor";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeOnlineStatus(value: string | null | undefined) {
  const normalized = toText(value).toLowerCase();

  if (!normalized) {
    return {
      isOnlineAvailable: true,
      onlineText: "Online görüşme",
    };
  }

  if (["evet", "yes", "true", "online", "aktif", "var"].includes(normalized)) {
    return {
      isOnlineAvailable: true,
      onlineText: "Online görüşme",
    };
  }

  if (["hayır", "hayir", "no", "false", "pasif", "yok"].includes(normalized)) {
    return {
      isOnlineAvailable: false,
      onlineText: "Görüşme tipi eşleşmede netleşir",
    };
  }

  return {
    isOnlineAvailable: true,
    onlineText: value || "Online görüşme",
  };
}

function isPublicExpert(row: ExpertRow) {
  const status = toText(row.status).toLowerCase();
  const accountStatus = toText(row.account_status).toLowerCase();

  const approvedStatuses = ["approved", "onaylı", "onayli", "active", "aktif"];
  const hiddenStatuses = ["rejected", "passive", "inactive", "hidden", "blocked"];

  if (hiddenStatuses.includes(status) || hiddenStatuses.includes(accountStatus)) return false;
  if (!status) return true;

  return approvedStatuses.includes(status);
}

function normalizeExpert(row: ExpertRow): PublicExpertProfile {
  const name = toText(row.name, "Mindora Uzmanı");
  const title = toText(row.title, "Uzman Psikolog");

  const areas = uniqueList([
    ...splitTextList(row.areas),
    ...splitTextList(row.specialties),
    ...splitTextList(row.focus_areas),
  ]);

  const education = splitTextList(row.education);
  const certificates = splitTextList(row.certificates);
  const online = normalizeOnlineStatus(row.online);
  const sessionPrice = toNumber(row.session_price ?? row.price, 0);
  const priceText = sessionPrice > 0 ? formatMoney(sessionPrice) : toText(row.price, "Eşleşme sonrası netleşir");
  const profileImageCandidate = toText(row.profile_image_url || row.photo_url) || null;
  const experienceYears = Math.max(0, Math.round(toNumber(row.experience_years, 0)));
  const averageRating = clampRating(row.average_rating);
  const reviewCount = Math.max(0, Math.round(toNumber(row.review_count, 0)));

  return {
    id: toText(row.id),
    slug: toText(row.slug),
    name,
    title,
    imageInitials: getInitials(name),
    profileImageUrl: isValidImageUrl(profileImageCandidate) ? profileImageCandidate : null,
    areas: areas.length > 0 ? areas : DEFAULT_SUPPORT_AREAS.slice(0, 3),
    education,
    certificates,
    experience:
      toText(row.experience) ||
      (experienceYears > 0 ? `${experienceYears}+ yıl deneyim` : "Eşleşme sırasında netleşir"),
    experienceYears,
    city: toText(row.city, "Online"),
    onlineText: online.onlineText,
    availabilityText: toText(
      row.availability,
      "Uygun gün ve saatler ön eşleşme sonrasında birlikte netleştirilir."
    ),
    priceText,
    sessionPrice,
    sessionDurationMinutes: Math.max(30, Math.round(toNumber(row.session_duration_minutes, 50))),
    bio: toText(
      row.public_bio || row.bio || row.expectation || row.note,
      "Bu uzman profili, danışanın ihtiyaçlarını daha doğru anlamak ve güvenli bir başlangıç yapmasını kolaylaştırmak için hazırlanmıştır."
    ),
    approach: toText(
      row.therapy_approach || row.approach || row.note,
      "İlk adımda ihtiyacın, beklentin ve uygun zamanların değerlendirilir. Ardından sana en uygun psikolojik destek süreci planlanır."
    ),
    isOnlineAvailable: online.isOnlineAvailable,
    averageRating,
    reviewCount,
    rankingScore: toNumber(row.ranking_score, reviewCount * 0.7 + averageRating * 20),
    createdAt: row.created_at || null,
  };
}

async function getExpertBySlug(slug: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from("experts")
    .select("*")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("PUBLIC_EXPERT_DETAIL_QUERY_ERROR", error);
  }

  if (data && isPublicExpert(data as ExpertRow)) {
    return normalizeExpert(data as ExpertRow);
  }

  const { data: fallbackData, error: fallbackError } = await (supabase as any)
    .from("experts")
    .select("*")
    .limit(100);

  if (fallbackError) {
    console.error("PUBLIC_EXPERT_DETAIL_FALLBACK_QUERY_ERROR", fallbackError);
    return null;
  }

  const fallbackExpert = ((fallbackData || []) as ExpertRow[]).find((expert) => {
    if (!isPublicExpert(expert)) return false;

    const realSlug = toText(expert.slug);
    const generatedSlug = createSlug(toText(expert.name));

    return realSlug === slug || generatedSlug === slug || toText(expert.id) === slug;
  });

  return fallbackExpert ? normalizeExpert(fallbackExpert) : null;
}

async function getPublicReviews(expertId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from("reviews")
    .select("id, expert_id, rating, review_text, created_at")
    .eq("expert_id", expertId)
    .eq("is_public", true)
    .eq("is_approved", true)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("PUBLIC_EXPERT_REVIEWS_QUERY_ERROR", error);
    return [];
  }

  return ((data || []) as ReviewRow[]).map((review) => ({
    id: review.id,
    rating: clampRating(review.rating),
    reviewText: toText(review.review_text, "Danışan yalnızca puan bıraktı."),
    createdAt: review.created_at,
  }));
}

function buildMetadataDescription(expert: PublicExpertProfile) {
  const areaText = expert.areas.slice(0, 3).join(", ");
  const ratingText =
    expert.reviewCount > 0
      ? ` ${expert.averageRating.toFixed(1)} puan ve ${expert.reviewCount} değerlendirme.`
      : "";

  return `${expert.name} - ${expert.title}. ${areaText} alanlarında Mindora üzerinden güvenli online psikolojik destek sürecine başlayın.${ratingText}`;
}

function buildJsonLd(expert: PublicExpertProfile, reviews: PublicReview[]) {
  const profileUrl = absoluteUrl(`/uzmanlar/${expert.slug}`);
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${profileUrl}#expert`,
    name: expert.name,
    jobTitle: expert.title,
    description: expert.bio,
    url: profileUrl,
    image: expert.profileImageUrl || undefined,
    knowsAbout: expert.areas,
    worksFor: {
      "@type": "Organization",
      name: "Mindora",
      url: SITE_URL,
    },
  };

  if (expert.reviewCount > 0 && expert.averageRating > 0) {
    base.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: expert.averageRating.toFixed(2),
      reviewCount: expert.reviewCount,
      bestRating: "5",
      worstRating: "1",
    };
  }

  if (reviews.length > 0) {
    base.review = reviews.slice(0, 5).map((review) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: "5",
        worstRating: "1",
      },
      author: {
        "@type": "Person",
        name: "Mindora danışanı",
      },
      reviewBody: review.reviewText,
      datePublished: review.createdAt,
    }));
  }

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return [base, faq];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug || !isSafeSlug(slug)) {
    return {
      title: "Uzman Profili | Mindora",
      description: DEFAULT_DESCRIPTION,
    };
  }

  const expert = await getExpertBySlug(slug);

  if (!expert) {
    return {
      title: "Uzman Profili Bulunamadı | Mindora",
      description: DEFAULT_DESCRIPTION,
    };
  }

  const description = buildMetadataDescription(expert);
  const canonical = `/uzmanlar/${expert.slug}`;

  return {
    title: `${expert.name} | ${expert.title} | Mindora`,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: `${expert.name} | Mindora`,
      description,
      type: "profile",
      url: canonical,
      images: expert.profileImageUrl
        ? [
            {
              url: expert.profileImageUrl,
              alt: `${expert.name} profil fotoğrafı`,
            },
          ]
        : undefined,
    },
    twitter: {
      card: expert.profileImageUrl ? "summary_large_image" : "summary",
      title: `${expert.name} | Mindora`,
      description,
      images: expert.profileImageUrl ? [expert.profileImageUrl] : undefined,
    },
  };
}

export default async function PublicExpertDetailPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug || !isSafeSlug(slug)) {
    notFound();
  }

  const expert = await getExpertBySlug(slug);

  if (!expert) {
    notFound();
  }

  const reviews = await getPublicReviews(expert.id);
  const matchingHref = `/eslesme?expert=${encodeURIComponent(expert.slug)}`;
  const jsonLd = buildJsonLd(expert, reviews);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f2eb] pb-24 text-[#171717] lg:pb-0">
      <Header />

      {jsonLd.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}

      <section className="mx-auto max-w-7xl px-5 py-7">
        <nav className="flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-500">
          <Link href="/" className="transition hover:text-black">
            Ana Sayfa
          </Link>
          <span>/</span>
          <Link href="/uzmanlar" className="transition hover:text-black">
            Uzmanlar
          </Link>
          <span>/</span>
          <span className="text-black">{expert.name}</span>
        </nav>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-10">
        <div className="grid gap-8 rounded-[2.25rem] border border-black/5 bg-white p-5 shadow-[0_24px_70px_rgba(15,15,15,0.06)] md:p-8 lg:grid-cols-[1fr_390px] lg:p-10">
          <div className="min-w-0">
            <div className="flex flex-col gap-7 md:flex-row">
              <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-[2rem] bg-black text-white shadow-sm ring-8 ring-[#f7f2eb] md:h-40 md:w-40">
                {hasRealProfileImage(expert) ? (
                  <img
                    src={expert.profileImageUrl || ""}
                    alt={`${expert.name} profil fotoğrafı`}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center text-center">
                    <span className="text-5xl font-black">{expert.imageInitials}</span>
                    <span className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                      Profil
                    </span>
                  </div>
                )}

                <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-black shadow-sm">
                  ✓
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <Badge tone="success">Mindora onaylı uzman</Badge>
                  <Badge tone="dark">{expert.onlineText}</Badge>
                  <Badge tone={expert.reviewCount > 0 ? "warning" : "neutral"}>
                    {getRatingText(expert)}
                  </Badge>
                </div>

                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  {expert.name}
                </h1>

                <p className="mt-3 text-lg font-black text-neutral-700">
                  {expert.title}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-neutral-500">
                  <span>{expert.experience}</span>
                  <span>•</span>
                  <span>{expert.city}</span>
                  <span>•</span>
                  <span>{expert.sessionDurationMinutes} dk online görüşme</span>
                </div>

                <p className="mt-6 max-w-3xl text-base leading-8 text-neutral-600">
                  {expert.bio}
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniStat label="Puan" value={expert.reviewCount > 0 ? expert.averageRating.toFixed(1) : "Yeni"} />
                  <MiniStat label="Yorum" value={`${expert.reviewCount}`} />
                  <MiniStat label="Seans" value={`${expert.sessionDurationMinutes} dk`} />
                  <MiniStat label="Uzmanlık" value={getPrimaryArea(expert)} />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {expert.areas.slice(0, 12).map((area) => (
                <span
                  key={area}
                  className="rounded-full bg-[#f7f2eb] px-4 py-2 text-xs font-black text-neutral-700 ring-1 ring-black/5"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>

          <aside className="self-start rounded-[2rem] bg-[#f7f2eb] p-5 ring-1 ring-black/5 md:p-6 lg:sticky lg:top-6">
            <div className="rounded-[1.6rem] bg-black p-5 text-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                Online görüşme
              </p>
              <p className="mt-3 text-4xl font-black">{expert.priceText}</p>
              <p className="mt-1 text-sm font-semibold text-white/65">
                {expert.sessionDurationMinutes} dakika · güvenli ödeme akışı
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-sm font-black text-black">Müsaitlik</p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">{expert.availabilityText}</p>
            </div>

            <div className="mt-5 grid gap-2">
              {TRUST_BADGES.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-neutral-700 ring-1 ring-black/5"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-black text-xs text-white">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={matchingHref}
                className="flex w-full items-center justify-center rounded-2xl bg-black px-5 py-3.5 text-sm font-black text-white transition hover:bg-neutral-800"
              >
                Ücretsiz ön eşleşme iste
              </Link>

              <Link
                href="/uzmanlar"
                className="flex w-full items-center justify-center rounded-2xl border border-black/10 bg-white px-5 py-3.5 text-sm font-black text-black transition hover:bg-[#f7f2eb]"
              >
                Diğer uzmanları gör
              </Link>
            </div>

            <p className="mt-5 text-xs leading-5 text-neutral-500">
              Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme riski varsa en yakın sağlık kuruluşuna başvur ya da 112 ile iletişime geç.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 lg:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <InfoCard title="Uzman Hakkında">
            <p className="text-sm leading-7 text-neutral-600 md:text-base md:leading-8">
              {expert.bio}
            </p>
          </InfoCard>

          <InfoCard title="Çalışma Yaklaşımı">
            <p className="text-sm leading-7 text-neutral-600 md:text-base md:leading-8">
              {expert.approach}
            </p>
          </InfoCard>

          <InfoCard title="Çalıştığı Konular">
            <div className="grid gap-3 sm:grid-cols-2">
              {expert.areas.map((area) => (
                <div
                  key={area}
                  className="rounded-2xl border border-black/5 bg-[#f7f2eb] px-4 py-4 text-sm font-black text-neutral-700"
                >
                  {area}
                </div>
              ))}
            </div>
          </InfoCard>

          <InfoCard title="Eğitim ve Yetkinlikler">
            <div className="grid gap-4 md:grid-cols-2">
              <ProfileList title="Eğitim" items={expert.education} empty={getEducationPreview(expert)} />
              <ProfileList title="Sertifikalar" items={expert.certificates} empty={getCertificatePreview(expert)} />
            </div>
          </InfoCard>

          <InfoCard title="Danışan Değerlendirmeleri">
            {expert.reviewCount > 0 ? (
              <div className="space-y-5">
                <div className="rounded-3xl bg-[#f7f2eb] p-5 ring-1 ring-black/5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-4xl font-black text-black">★ {expert.averageRating.toFixed(1)}</p>
                      <p className="mt-1 text-sm font-bold text-neutral-600">
                        {expert.reviewCount} onaylı değerlendirme
                      </p>
                    </div>
                    <p className="max-w-md text-sm leading-6 text-neutral-600">
                      Yorumlar yalnızca tamamlanan seanslardan sonra alınır ve yayınlanmadan önce moderasyondan geçer.
                    </p>
                  </div>
                </div>

                {reviews.length > 0 ? (
                  <div className="grid gap-3">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <TrustEmptyState
                    title="Yorum metinleri yakında burada listelenecek."
                    text="Bu uzman için onaylı değerlendirme sayısı mevcut. Yayınlanan yorumlar moderasyon sonrasında görünür olur."
                  />
                )}
              </div>
            ) : (
              <TrustEmptyState
                title="İlk danışan değerlendirmeleri burada yayınlanacaktır."
                text="Mindora yalnızca tamamlanan seanslardan sonra yorum kabul eder ve yorumları yayınlamadan önce moderasyondan geçirir."
              />
            )}
          </InfoCard>

          <InfoCard title="Sık Sorulan Sorular">
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question} className="rounded-2xl bg-[#f7f2eb] p-4 ring-1 ring-black/5">
                  <summary className="cursor-pointer text-sm font-black text-black">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard title="Güvenli Süreç">
            <div className="space-y-3">
              <InfoRow label="Profil" value="Onaylı" />
              <InfoRow label="Görüşme" value={expert.onlineText} />
              <InfoRow label="Süre" value={`${expert.sessionDurationMinutes} dk`} />
              <InfoRow label="Ücret" value={expert.priceText} />
              <InfoRow
                label="Puan"
                value={expert.reviewCount > 0 ? `${expert.averageRating.toFixed(1)} / 5` : "Yeni"}
              />
            </div>
          </InfoCard>

          <InfoCard title="Mindora Akışı">
            <List items={PROCESS_STEPS} />
          </InfoCard>

          <InfoCard title="Neden bu uzman?">
            <div className="space-y-3">
              <ReasonCard title="İhtiyaç odaklı başlangıç" text="Ön eşleşme formundaki bilgilerle görüşme sürecinin daha doğru başlaması hedeflenir." />
              <ReasonCard title="Net süreç akışı" text="Eşleşme, randevu, ödeme ve online görüşme adımları Mindora içinde takip edilir." />
              <ReasonCard title="Şeffaf profil" text="Çalışma alanları, yaklaşım, değerlendirme ve seans bilgileri açık şekilde gösterilir." />
            </div>
          </InfoCard>

          <InfoCard title="Ön eşleşme notu">
            <p className="text-sm leading-7 text-neutral-600">
              Bu profil ilk kararını kolaylaştırmak için hazırlanmıştır. Nihai uzman uygunluğu, destek ihtiyacın, beklentin ve müsaitlik durumun ön eşleşme sonrasında netleşir.
            </p>
          </InfoCard>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="rounded-[2rem] bg-black p-8 text-white shadow-sm md:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.25em] text-neutral-400">
                Ücretsiz ön eşleşme
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                Bu uzman senin için uygun mu birlikte değerlendirelim.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                Kısa formu doldur. Mindora ekibi ihtiyacına, beklentine ve uygun zamanına göre süreci güvenli şekilde başlatsın.
              </p>
            </div>

            <Link
              href={matchingHref}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-neutral-200"
            >
              Ücretsiz Ön Eşleşmeye Başla
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 px-4 py-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-black">{expert.name}</p>
            <p className="text-xs font-bold text-neutral-500">
              {expert.reviewCount > 0 ? `★ ${expert.averageRating.toFixed(1)} · ` : ""}
              {expert.priceText}
            </p>
          </div>
          <Link
            href={matchingHref}
            className="shrink-0 rounded-2xl bg-black px-5 py-3 text-sm font-black text-white"
          >
            Eşleşme
          </Link>
        </div>
      </div>
    </main>
  );
}


function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "dark" | "warning" | "neutral";
}) {
  const className =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800 ring-amber-100"
        : tone === "neutral"
          ? "bg-neutral-100 text-neutral-700 ring-neutral-200"
          : "bg-black text-white ring-black";

  return <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f2eb] px-4 py-3 ring-1 ring-black/5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-black text-black">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black tracking-tight text-black">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f7f2eb] px-4 py-3 text-sm ring-1 ring-black/5">
      <span className="text-neutral-600">{label}</span>
      <span className="text-right font-black text-black">{value}</span>
    </div>
  );
}

function ReasonCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f2eb] p-4 ring-1 ring-black/5">
      <h3 className="text-sm font-black text-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
    </div>
  );
}

function ProfileList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="rounded-2xl bg-[#f7f2eb] p-4 ring-1 ring-black/5">
      <h3 className="text-sm font-black text-black">{title}</h3>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-neutral-600">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-neutral-600">{empty}</p>
      )}
    </div>
  );
}

function TrustEmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl bg-[#f7f2eb] p-5 ring-1 ring-black/5">
      <div className="flex gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-black text-white">
          ✓
        </span>
        <div>
          <p className="text-sm font-black text-black">{title}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const roundedRating = Math.round(review.rating);

  return (
    <article className="rounded-2xl bg-[#f7f2eb] p-4 ring-1 ring-black/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 text-lg" aria-label={`${review.rating} yıldız`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span key={star} className={star <= roundedRating ? "text-amber-400" : "text-neutral-300"}>
              ★
            </span>
          ))}
        </div>
        <span className="text-xs font-bold text-neutral-500">{formatDate(review.createdAt)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-700">{review.reviewText}</p>
    </article>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-neutral-600">
          <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black text-[10px] font-black text-white">
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
