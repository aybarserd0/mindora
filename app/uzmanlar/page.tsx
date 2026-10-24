"use client";

import Header from "@/components/Header";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Reveal from "@/components/marketing/Reveal";
import PageHero from "@/components/marketing/PageHero";
import CtaBand from "@/components/marketing/CtaBand";
import { Avatar, Chip, FloatingNote, IconBadge, Icons, SampleCaption, ThreadLine } from "@/components/marketing/Mocks";

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
  supervised?: boolean;
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

// Uzman listesi alanlarını eşleşme formundaki konu seçeneklerine bağlar
const MATCH_TOPIC: Record<string, string> = {
  "Kaygı ve stres": "Kaygı / stres",
  "İlişki problemleri": "İlişki / aile",
  "Özgüven": "Özgüven",
  "Depresif duygu durumu": "Depresif hisler",
  "Aile içi iletişim": "İlişki / aile",
  "Sınav ve gelecek kaygısı": "Kaygı / stres",
  "Motivasyon eksikliği": "Motivasyon",
  "Tükenmişlik": "Tükenmişlik",
};

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
    icon: Icons.shield,
    tone: "pine" as const,
    title: "Belgeler tek tek kontrol edildi",
    text: "Diploma ve unvan incelenmeden hiçbir profil bu listede yer almaz.",
  },
  {
    icon: Icons.people,
    tone: "lilac" as const,
    title: "Süpervizyonlu Uzman rozeti",
    text: "Son üç ayda kıdemli bir meslektaşıyla düzenli süpervizyon yapan psikologlar rozetle görünür.",
  },
  {
    icon: Icons.tag,
    tone: "pine" as const,
    title: "Ücret baştan belli",
    text: "Seans ücreti profilde yazar; ödeme adımında sürpriz bir tutarla karşılaşmazsın.",
  },
  {
    icon: Icons.noRecord,
    tone: "pine" as const,
    title: "Görüşmeler kaydedilmez",
    text: "Görüntülü seanslar yalnızca sen ve psikoloğun arasında kalır.",
  },
];

const PROCESS_ITEMS = [
  { title: "Kısa formu doldur", text: "Ne yaşadığını kendi kelimelerinle anlat, yaklaşık üç dakika." },
  { title: "Önerileri incele", text: "İhtiyacına ve bütçene uygun psikologları birlikte gözden geçir." },
  { title: "Randevunu al", text: "Takvimden saat seç, ödemeyi güvenle tamamla ve görüşmeye katıl." },
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
    <main className="min-h-screen overflow-x-clip bg-white text-slate-900">
      <Header />

      <PageHero
        title="Listedeki her psikolog bir kontrolden geçti."
        lead="Profiller incelenmeden yayınlanmaz, ücretler baştan yazar, görüşmeler kaydedilmez. Düzenli süpervizyon alan uzmanları da rozetinden tanırsın."
        visual={
          <>
            <ThreadLine className="absolute inset-0 h-full w-full" d="M10 360 C 150 220, 250 400, 360 240 S 520 60, 570 100" length={850} />
            <div className="relative z-10 w-full max-w-sm space-y-3">
              {[
                { i: "DA", n: "Uzm. Klinik Psk. Deniz A.", t: "Kaygı · İlişkiler", b: true },
                { i: "EK", n: "Psk. Elif K.", t: "Özgüven · Tükenmişlik", b: false },
                { i: "MY", n: "Uzm. Psk. Mert Y.", t: "Depresif duygu durumu", b: true },
              ].map((c, idx) => (
                <div
                  key={c.n}
                  className="animate-drift flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200/70"
                  style={{ ["--drift-delay" as string]: `${idx * 0.7}s`, ["--tilt" as string]: `${idx % 2 ? 1.2 : -1.2}deg`, marginLeft: `${idx === 1 ? 32 : 0}px` }}
                >
                  <Avatar initials={c.i} tone={idx === 1 ? "pine" : "lilac"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold text-slate-900">{c.n}</p>
                    <p className="truncate text-xs text-slate-500">{c.t}</p>
                  </div>
                  {c.b ? <Chip tone="lilac" icon={Icons.people}>Süpervizyonlu</Chip> : <Chip icon={Icons.shield}>Doğrulandı</Chip>}
                </div>
              ))}
            </div>
            <FloatingNote className="-bottom-2 left-2 z-20" tilt="-2deg" delay="1.2s" icon={<IconBadge>{Icons.tag}</IconBadge>}>
              Seans ücreti profilde yazar
            </FloatingNote>
            <SampleCaption className="absolute -bottom-8 right-0" />
          </>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/eslesme" className="inline-flex justify-center rounded-full bg-pine-800 px-7 py-3.5 font-semibold text-white transition-colors hover:bg-pine-900">
            Benim için seçsinler
          </Link>
          <Link href="#uzman-listesi" className="inline-flex justify-center rounded-full border border-slate-300 bg-white px-7 py-3.5 font-semibold text-slate-800 transition-colors hover:border-slate-400">
            Listeye göz at
          </Link>
        </div>
        {approvedExpertCount > 0 ? (
          <p className="mt-5 text-sm text-slate-500">Şu anda {approvedExpertCount} onaylı uzman listeleniyor.</p>
        ) : null}
      </PageHero>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_ITEMS.map((item, i) => (
            <Reveal key={item.title} delay={i * 70} className="rounded-3xl bg-slate-50 p-6 ring-1 ring-slate-200/70">
              <IconBadge tone={item.tone}>{item.icon}</IconBadge>
              <h2 className="mt-4 font-display text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="uzman-listesi" className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Onaylı psikologlar
            </h2>
          </div>

          <p className="text-base leading-7 text-slate-500 lg:justify-self-end lg:text-right">
            Konuya, ücrete ya da puana göre filtrele. Karar veremezsen ücretsiz ön eşleşme
            seçimi senin yerine kolaylaştırır.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-200/80 bg-slate-50 p-5">
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
                        ? "border-pine-800 bg-pine-800 text-white"
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
            {filteredExperts.map((expert, index) => (
              <Reveal key={expert.id} delay={(index % 3) * 70} className="h-full">
                <ExpertCard expert={expert} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="bg-pine-950 text-white">
        <div className="relative mx-auto max-w-7xl overflow-hidden px-5 py-20 lg:py-28">
          <ThreadLine className="absolute inset-0 h-full w-full opacity-25" d="M-20 420 C 240 200, 520 480, 800 240 S 1150 60, 1300 160" length={1600} />
          <div className="relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <h2 className="text-3xl font-semibold leading-tight sm:text-5xl">Kimi seçeceğini bilmiyor musun? Normal.</h2>
              <p className="mt-5 max-w-lg text-lg leading-8 text-white/75">
                Çoğu platformda yüzlerce profil arasında tek başına karar vermen beklenir. Mindora&apos;da ihtiyacını
                anlatman yeterli; uygun psikologları sana biz önerelim.
              </p>
              <Link href="/eslesme" className="mt-8 inline-flex rounded-full bg-white px-7 py-3.5 font-semibold text-slate-900 transition-colors hover:bg-slate-100">
                Ücretsiz eşleşmeyi başlat
              </Link>
            </Reveal>
            <ol className="space-y-3">
              {PROCESS_ITEMS.map((item, index) => (
                <Reveal as="li" key={item.title} delay={index * 90} className="flex gap-4 rounded-3xl bg-white/[0.06] p-5 ring-1 ring-white/10">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lilac-200 font-display font-semibold text-lilac-950">
                    {index + 1}
                  </span>
                  <span>
                    <span className="block font-display text-lg font-semibold">{item.title}</span>
                    <span className="mt-1 block text-sm leading-6 text-white/70">{item.text}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-20 lg:py-24">
        <Reveal className="text-center">
          <h2 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-5xl">Hangi konuda destek arıyorsun?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600">
            Birini seç, formu o konuyla başlatalım. Tam tarif edemesen de sorun değil.
          </p>
        </Reveal>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {SUPPORT_AREAS.filter((area) => area !== "Tümü").map((area, i) => (
            <Reveal key={area} delay={i * 40}>
              <Link
                href={`/eslesme?konu=${encodeURIComponent(MATCH_TOPIC[area] || "Diğer")}`}
                className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:-translate-y-0.5 hover:border-pine-300 hover:text-pine-800"
              >
                {area}
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <CtaBand
        title="Sana uygun psikoloğu birlikte bulalım."
        text="Kısa formu doldur, ihtiyacına uygun uzmanları ücretsiz olarak önerelim."
        primary={{ label: "Ücretsiz eşleşmeyi başlat", href: "/eslesme" }}
        secondary={{ label: "Uzman olarak başvur", href: "/uzman-basvuru" }}
      />
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
    <article className="flex h-full min-w-0 flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-pine-800 text-white">
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

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-pine-50 px-2.5 py-1 text-[11px] font-semibold text-pine-800 ring-1 ring-pine-100">
              {Icons.shield}
              Belgeleri doğrulandı
            </span>
            {expert.supervised ? (
              <span
                title="Son üç ayda kıdemli bir meslektaşıyla düzenli süpervizyon görüşmesi yaptı."
                className="inline-flex items-center gap-1 rounded-full bg-lilac-50 px-2.5 py-1 text-[11px] font-semibold text-lilac-800 ring-1 ring-lilac-100"
              >
                {Icons.people}
                Süpervizyonlu Uzman
              </span>
            ) : null}
          </div>
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
          className="rounded-full bg-pine-800 px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-pine-900"
        >
          Profili incele
        </Link>

        <Link
          href={matchHref}
          className="rounded-full border border-slate-200 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
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
          className="mt-6 inline-block rounded-full bg-pine-800 px-7 py-3 font-semibold text-white transition hover:bg-pine-900"
        >
          {actionLabel}
        </Link>
      ) : null}

      {!href && actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full bg-pine-800 px-7 py-3 font-semibold text-white transition hover:bg-pine-900"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
