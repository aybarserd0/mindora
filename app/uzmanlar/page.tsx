"use client";

import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type SortOption = "recommended" | "rating" | "review_count" | "newest" | "price_low" | "price_high";

type Expert = {
  id: string;
  name: string;
  slug?: string | null;
  title: string | null;
  areas: string | null;
  experience: string | null;
  online: string | null;
  availability: string | null;
  photo_url: string | null;
  price?: number | string | null;
  session_price?: number | string | null;
  sessionDuration?: string | null;
  status?: string | null;
  average_rating?: number | string | null;
  review_count?: number | string | null;
  ranking_score?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ExpertsResponse = {
  ok?: boolean;
  experts?: Expert[];
  error?: string;
};

const SUPPORT_AREAS = [
  "Tümü",
  "Kaygı ve stres",
  "İlişki problemleri",
  "Özgüven",
  "Depresif duygu durumu",
  "Aile içi iletişim",
  "Sınav ve gelecek kaygısı",
  "Motivasyon eksikliği",
  "Tükenmişlik",
];

const SORT_OPTIONS: Array<{ label: string; value: SortOption }> = [
  { label: "Önerilen", value: "recommended" },
  { label: "En yüksek puan", value: "rating" },
  { label: "En çok yorum", value: "review_count" },
  { label: "Yeni uzmanlar", value: "newest" },
  { label: "Ücret düşükten yükseğe", value: "price_low" },
  { label: "Ücret yüksekten düşüğe", value: "price_high" },
];

const TRUST_ITEMS = [
  {
    title: "Onaylı uzman profilleri",
    text: "Listelenen uzmanlar Mindora başvuru ve profil inceleme sürecinden sonra görünür olur.",
  },
  {
    title: "Gerçek değerlendirme altyapısı",
    text: "Yorumlar yalnızca tamamlanan seanslardan sonra alınır ve yayınlanmadan önce moderasyondan geçer.",
  },
  {
    title: "Tek yerden süreç",
    text: "Eşleşme, randevu, ödeme, mesajlaşma ve video görüşme akışı aynı platformda ilerler.",
  },
];

const PROCESS_ITEMS = [
  "Kısa ön eşleşme formunu doldur",
  "İhtiyacına uygun uzman profillerini incele",
  "Randevu, ödeme ve görüşme akışını güvenli şekilde tamamla",
];

function toText(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text || fallback;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatTitle(title: string | null) {
  const cleanTitle = toText(title, "Uzman Psikolog");
  return cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0]?.charAt(0).toLocaleUpperCase("tr-TR") || "M";

  const first = parts[0]?.charAt(0) || "M";
  const last = parts[parts.length - 1]?.charAt(0) || "";

  return `${first}${last}`.toLocaleUpperCase("tr-TR");
}

function createSlug(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getExpertSlug(expert: Expert) {
  const slug = toText(expert.slug);
  if (slug) return slug;

  const generatedSlug = createSlug(expert.name);
  return generatedSlug || expert.id;
}

function splitAreas(areas: string | null) {
  if (!areas) return [];

  return areas
    .split(",")
    .map((area) => area.trim())
    .filter(Boolean);
}

function isPhotoUrlValid(url: string | null) {
  if (!url) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function normalizeOnlineStatus(value: string | null) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) return "Online durum eşleşmede netleşir";
  if (["evet", "yes", "true", "online"].includes(normalized)) {
    return "Online görüşme yapıyor";
  }
  if (["hayır", "hayir", "no", "false"].includes(normalized)) {
    return "Online durum eşleşmede netleşir";
  }

  return value || "Eşleşmede netleşir";
}

function getPrice(expert: Expert) {
  const raw = expert.session_price ?? expert.price;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getAverageRating(expert: Expert) {
  const rating = toNumber(expert.average_rating, 0);
  if (rating < 0) return 0;
  if (rating > 5) return 5;
  return rating;
}

function getReviewCount(expert: Expert) {
  const count = Math.round(toNumber(expert.review_count, 0));
  return count > 0 ? count : 0;
}

function getRankingScore(expert: Expert) {
  const score = toNumber(expert.ranking_score, 0);
  if (score > 0) return score;

  const rating = getAverageRating(expert);
  const reviewCount = getReviewCount(expert);

  return reviewCount * 0.7 + rating * 20;
}

function getCreatedTime(expert: Expert) {
  const raw = expert.created_at || expert.updated_at;
  if (!raw) return 0;

  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

function formatMoney(value: number | null) {
  if (!value) return "Eşleşmede netleşir";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function getReviewLabel(count: number) {
  if (count <= 0) return "Henüz değerlendirme yok";
  return `${count} değerlendirme`;
}

function getExperienceLabel(value: string | null) {
  const text = toText(value);
  return text || "Deneyim eşleşmede netleşir";
}

function getSessionDurationLabel(expert: Expert) {
  return toText(expert.sessionDuration) || "50 dk";
}

function getPriceLabel(price: number | null) {
  if (!price) return "Ücret eşleşmede netleşir";
  return `${formatMoney(price)} / seans`;
}

function getCardSummary(expert: Expert) {
  const areas = splitAreas(expert.areas);
  const firstArea = areas[0] || "Online psikolojik destek";
  const title = formatTitle(expert.title);

  return `${title} olarak ${firstArea.toLocaleLowerCase("tr-TR")} alanında destek sunar. Detaylı profilinde eğitim, yaklaşım ve uygunluk bilgilerini inceleyebilirsin.`;
}

function matchesSearch(expert: Expert, searchTerm: string) {
  const query = searchTerm.trim().toLocaleLowerCase("tr-TR");
  if (!query) return true;

  const searchableText = [
    expert.name,
    expert.title,
    expert.areas,
    expert.experience,
    expert.availability,
    getAverageRating(expert) ? `${getAverageRating(expert).toFixed(1)} puan` : "",
    getReviewCount(expert) ? `${getReviewCount(expert)} değerlendirme` : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return searchableText.includes(query);
}

function sortExperts(experts: Expert[], sortOption: SortOption) {
  return [...experts].sort((a, b) => {
    const aPrice = getPrice(a) ?? Number.MAX_SAFE_INTEGER;
    const bPrice = getPrice(b) ?? Number.MAX_SAFE_INTEGER;

    if (sortOption === "rating") {
      return (
        getAverageRating(b) - getAverageRating(a) ||
        getReviewCount(b) - getReviewCount(a) ||
        getRankingScore(b) - getRankingScore(a) ||
        a.name.localeCompare(b.name, "tr")
      );
    }

    if (sortOption === "review_count") {
      return (
        getReviewCount(b) - getReviewCount(a) ||
        getAverageRating(b) - getAverageRating(a) ||
        getRankingScore(b) - getRankingScore(a) ||
        a.name.localeCompare(b.name, "tr")
      );
    }

    if (sortOption === "newest") {
      return getCreatedTime(b) - getCreatedTime(a) || a.name.localeCompare(b.name, "tr");
    }

    if (sortOption === "price_low") {
      return aPrice - bPrice || getRankingScore(b) - getRankingScore(a);
    }

    if (sortOption === "price_high") {
      return bPrice - aPrice || getRankingScore(b) - getRankingScore(a);
    }

    return (
      getRankingScore(b) - getRankingScore(a) ||
      getAverageRating(b) - getAverageRating(a) ||
      getReviewCount(b) - getReviewCount(a) ||
      a.name.localeCompare(b.name, "tr")
    );
  });
}

function RatingLine({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (reviewCount <= 0 || rating <= 0) {
    return <p className="text-xs font-medium text-slate-400">Yeni uzman — henüz değerlendirme yok</p>;
  }

  return (
    <p className="text-xs font-medium text-slate-500">
      <span className="font-semibold text-slate-900">{rating.toFixed(1)}</span> ortalama değerlendirme ·{" "}
      {getReviewLabel(reviewCount)}
    </p>
  );
}

export default function UzmanlarPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState("Tümü");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("recommended");

  const fetchExperts = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const res = await fetch("/api/experts", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Uzmanlar yüklenemedi. Kod: ${res.status}`);
      }

      const data = (await res.json()) as ExpertsResponse;

      if (!data.ok) {
        throw new Error(data.error || "Uzmanlar alınamadı.");
      }

      setExperts(Array.isArray(data.experts) ? data.experts : []);
    } catch (error) {
      console.error("Uzmanlar alınamadı:", error);
      setErrorMessage("Uzmanlar şu anda yüklenemedi. Lütfen biraz sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadExperts() {
      if (!isActive) return;
      await fetchExperts();
    }

    loadExperts();

    return () => {
      isActive = false;
    };
  }, [fetchExperts]);

  const visibleExperts = useMemo(
    () =>
      experts.filter((expert) => {
        const status = toText(expert.status).toLowerCase();
        const isHidden = ["rejected", "passive", "inactive", "hidden"].includes(status);

        return Boolean(expert.id && expert.name?.trim() && !isHidden);
      }),
    [experts]
  );

  const filteredExperts = useMemo(() => {
    const filtered = visibleExperts.filter((expert) => {
      const expertAreas = splitAreas(expert.areas);
      const areaMatches = selectedArea === "Tümü" || expertAreas.includes(selectedArea);

      return areaMatches && matchesSearch(expert, searchTerm);
    });

    return sortExperts(filtered, sortOption);
  }, [searchTerm, selectedArea, sortOption, visibleExperts]);

  const hasFilters = selectedArea !== "Tümü" || searchTerm.trim().length > 0 || sortOption !== "recommended";
  const approvedExpertCount = visibleExperts.length;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <Header />

      <section className="border-b border-slate-200/80 bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Mindora Uzman Ağı
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Sana uygun uzmanı güvenle bul.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-500">
              Mindora, yalnızca uzman listeleyen bir platform değil; ihtiyacını,
              uygun zamanını ve beklentini birlikte dikkate alan daha güvenli bir
              başlangıç deneyimidir.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/eslesme"
                className="rounded-lg bg-slate-900 px-8 py-4 text-center font-semibold text-white transition hover:bg-slate-800"
              >
                Ücretsiz ön eşleşme başlat
              </Link>

              <Link
                href="#uzman-listesi"
                className="rounded-lg border border-slate-200 bg-white px-8 py-4 text-center font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Uzmanları incele
              </Link>
            </div>

            {approvedExpertCount > 0 ? (
              <p className="mt-6 text-sm font-medium text-slate-400">
                Şu anda {approvedExpertCount} onaylı uzman profili listeleniyor.
              </p>
            ) : null}
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="uzman-listesi" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Uzmanlar
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
              Onaylı uzman profilleri.
            </h2>
          </div>

          <p className="text-base leading-7 text-slate-500 lg:justify-self-end lg:text-right">
            Uzman seçimini kolaylaştırmak için destek konusu, uzmanlık alanı,
            ücret, görüşme tipi ve uygunluk bilgisi birlikte gösterilir.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 xl:grid-cols-[0.75fr_1.1fr_0.65fr] xl:items-start">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Uzman ara</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="İsim, alan veya deneyim ara..."
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Destek alanı</p>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => setSelectedArea(area)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selectedArea === area
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Sıralama</span>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200/80 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              {loading ? "Uzmanlar yükleniyor..." : `${filteredExperts.length} uzman listeleniyor`}
            </p>
            {hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedArea("Tümü");
                  setSortOption("recommended");
                }}
                className="w-fit rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
              >
                Filtreleri temizle
              </button>
            ) : null}
          </div>
        </div>

        {loading ? (
          <ExpertSkeleton />
        ) : errorMessage ? (
          <EmptyState
            title="Uzmanlar yüklenemedi."
            text={errorMessage}
            actionLabel="Tekrar dene"
            onAction={fetchExperts}
          />
        ) : visibleExperts.length === 0 ? (
          <EmptyState
            title="Henüz onaylı uzman yok."
            text="Uzman başvuruları incelendikten sonra onaylanan profiller bu sayfada listelenecek. Bu sırada ücretsiz ön eşleşme formunu doldurabilirsin."
            href="/eslesme"
            actionLabel="Ön eşleşme başlat"
          />
        ) : filteredExperts.length === 0 ? (
          <EmptyState
            title="Bu filtreyle uzman bulunamadı."
            text="Arama kelimesini, destek alanını veya sıralama tercihini değiştirerek tekrar deneyebilirsin."
            actionLabel={hasFilters ? "Filtreleri temizle" : undefined}
            onAction={
              hasFilters
                ? () => {
                    setSearchTerm("");
                    setSelectedArea("Tümü");
                    setSortOption("recommended");
                  }
                : undefined
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredExperts.map((expert) => (
              <ExpertCard key={expert.id} expert={expert} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-slate-900 p-8 text-white md:p-14">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Eşleşme mantığı
              </p>

              <h2 className="mt-4 text-3xl font-bold md:text-4xl">
                Herkes için aynı uzman değil, sana uygun başlangıç.
              </h2>
            </div>

            <div className="space-y-5 text-lg leading-8 text-slate-300">
              <p>
                Mindora’da amaç rastgele yönlendirme yapmak değil; kişinin ihtiyacını
                anlayarak uygun uzmanla daha güvenli bir başlangıç yapmasını sağlamaktır.
              </p>

              <div className="space-y-3">
                {PROCESS_ITEMS.map((item, index) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-lg border border-white/10 p-4 text-sm font-medium text-white"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-900">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/eslesme"
                className="inline-block rounded-lg bg-white px-7 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Eşleşme formunu doldur
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Destek alanları
          </p>

          <h2 className="mt-3 text-3xl font-bold text-slate-900 md:text-4xl">
            Hangi konuda destek alabilirsin?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-7 text-slate-500">
            Konunu tam tarif edemesen bile ön eşleşme formu ihtiyacını daha anlaşılır
            hale getirmek için tasarlanmıştır.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {SUPPORT_AREAS.filter((area) => area !== "Tümü").map((area) => (
            <div
              key={area}
              className="rounded-lg border border-slate-200/80 p-5 text-center font-medium text-slate-600"
            >
              {area}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm md:p-14">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            Sana uygun uzmanı birlikte bulalım.
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-500">
            Kısa formu doldur, ihtiyacına uygun psikolojik destek süreci için ücretsiz
            ön eşleşmeyi başlat.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/eslesme"
              className="rounded-lg bg-slate-900 px-9 py-4 font-semibold text-white transition hover:bg-slate-800"
            >
              Ücretsiz ön eşleşme başlat
            </Link>

            <Link
              href="/uzman-basvuru"
              className="rounded-lg border border-slate-200 bg-white px-9 py-4 font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Uzman olarak başvur
            </Link>
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-xs leading-6 text-slate-400">
            Mindora acil kriz hattı değildir. Kendine veya bir başkasına zarar verme
            riski varsa lütfen en yakın sağlık kuruluşuna başvur ya da 112 ile
            iletişime geç.
          </p>
        </div>
      </section>
    </main>
  );
}

function ExpertCard({ expert }: { expert: Expert }) {
  const expertAreas = splitAreas(expert.areas);
  const showPhoto = isPhotoUrlValid(expert.photo_url);
  const slug = getExpertSlug(expert);
  const profileHref = `/uzmanlar/${slug}`;
  const matchHref = `/eslesme?expert=${encodeURIComponent(slug)}`;
  const price = getPrice(expert);
  const averageRating = getAverageRating(expert);
  const reviewCount = getReviewCount(expert);

  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-900 text-white">
          {showPhoto ? (
            <Image
              src={expert.photo_url || ""}
              alt={`${expert.name} profil fotoğrafı`}
              fill
              sizes="64px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold">
              {getInitials(expert.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-slate-900">{expert.name}</h3>
          </div>

          <p className="truncate text-sm font-medium text-slate-500">{formatTitle(expert.title)}</p>

          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
            <span aria-hidden="true">✓</span>
            Kimlik/diploma doğrulandı
          </span>
        </div>
      </div>

      <div className="mt-4">
        <RatingLine rating={averageRating} reviewCount={reviewCount} />
      </div>

      <p className="mt-4 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-500">
        {getCardSummary(expert)}
      </p>

      <div className="mt-4 flex min-h-[2.25rem] flex-wrap gap-2">
        {expertAreas.length > 0 ? (
          <>
            {expertAreas.slice(0, 4).map((area) => (
              <span
                key={area}
                className="rounded-md border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {area}
              </span>
            ))}

            {expertAreas.length > 4 ? (
              <span className="rounded-md border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
                +{expertAreas.length - 4}
              </span>
            ) : null}
          </>
        ) : (
          <span className="rounded-md border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            Uzmanlık alanı eşleşmede netleşir
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <CompactInfo label="Deneyim" value={getExperienceLabel(expert.experience)} />
        <CompactInfo label="Görüşme" value={normalizeOnlineStatus(expert.online)} />
        <CompactInfo label="Seans süresi" value={getSessionDurationLabel(expert)} />
        <CompactInfo label="Ücret" value={getPriceLabel(price)} />
      </div>

      <div className="mt-5 grid gap-2.5">
        <Link
          href={profileHref}
          className="rounded-lg bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Profili incele
        </Link>

        <Link
          href={matchHref}
          className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Ücretsiz ön eşleşme iste
        </Link>
      </div>
    </article>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-start justify-between gap-4 text-sm">
      <span className="shrink-0 font-medium text-slate-500">{label}</span>
      <span className="max-w-[62%] text-right font-semibold text-slate-900">{value}</span>
    </p>
  );
}

function ExpertSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="h-16 w-16 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-6 h-5 w-40 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-3 h-4 w-28 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-50" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  text,
  href,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  href?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-3 leading-7 text-slate-500">{text}</p>

      {href && actionLabel ? (
        <Link
          href={href}
          className="mt-6 inline-block rounded-lg bg-slate-900 px-7 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          {actionLabel}
        </Link>
      ) : null}

      {!href && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-lg bg-slate-900 px-7 py-3 font-semibold text-white transition hover:bg-slate-800"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
