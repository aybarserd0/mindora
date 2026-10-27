"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DocumentStatus = "missing" | "pending" | "approved" | "rejected";

type DocumentKey = "diploma" | "license" | "certificate" | "identity";

type VerificationDocument = {
  key: DocumentKey;
  title: string;
  description: string;
  status: DocumentStatus;
  required: boolean;
  verificationId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
};

type UploadState = {
  loading: boolean;
  message: string;
  error: string;
  fileName: string;
};

type VerificationApiDocument = {
  documentType: DocumentKey;
  documentLabel?: string;
  documentDescription?: string;
  required?: boolean;
  status: DocumentStatus;
  verificationId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
};

type VerificationApiResponse = {
  ok?: boolean;
  documents?: VerificationApiDocument[];
  summary?: {
    progress?: number;
    isReadyForReview?: boolean;
    isVerified?: boolean;
    pending?: number;
    approved?: number;
    rejected?: number;
  };
  error?: string;
};

const initialDocuments: VerificationDocument[] = [
  {
    key: "diploma",
    title: "Diploma",
    description: "Mezuniyet belgeni yükle.",
    status: "missing",
    required: true,
  },
  {
    key: "license",
    title: "Lisans / Yetkinlik Belgesi",
    description: "Mesleki yeterlilik ya da unvan belgeni yükle.",
    status: "missing",
    required: true,
  },
  {
    key: "certificate",
    title: "Ek sertifikalar",
    description: "Aldığın ek eğitimlerin sertifikaları. İsteğe bağlı.",
    status: "missing",
    required: false,
  },
  {
    key: "identity",
    title: "Kimlik Doğrulama",
    description: "Gerekli görülürse kimlik belgeni yükleyebilirsin.",
    status: "missing",
    required: false,
  },
];

const acceptedFileTypes = ".pdf,.png,.jpg,.jpeg";
const maxFileSizeMb = 10;

function getDocumentIcon(key: DocumentKey) {
  if (key === "diploma") return "🎓";
  if (key === "license") return "📄";
  if (key === "certificate") return "📜";
  return "🪪";
}

function getStatusLabel(status: DocumentStatus) {
  if (status === "approved") return "Onaylandı";
  if (status === "pending") return "İncelemede";
  if (status === "rejected") return "Reddedildi";
  return "Eksik";
}

function getStatusClass(status: DocumentStatus) {
  if (status === "approved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "pending") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "rejected") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getStatusMessage(status: DocumentStatus) {
  if (status === "approved") return "Belgeniz incelendi ve onaylandı.";
  if (status === "pending") return "Belgeniz Mindora ekibi tarafından inceleniyor.";
  if (status === "rejected") return "Belgeniz reddedildi. Açıklamaya göre yeniden yükleyebilirsiniz.";
  return "Bu belge henüz yüklenmedi.";
}

function getRequiredCounts(items: VerificationDocument[]) {
  const requiredItems = items.filter((item) => item.required);
  const submitted = requiredItems.filter((item) =>
    ["pending", "approved"].includes(item.status)
  ).length;
  const approved = requiredItems.filter((item) => item.status === "approved").length;

  return {
    total: requiredItems.length,
    submitted,
    approved,
  };
}

function getProgressValue(items: VerificationDocument[]) {
  const counts = getRequiredCounts(items);
  if (counts.total === 0) return 0;

  return Math.round((counts.submitted / counts.total) * 100);
}

function createInitialUploadState() {
  return initialDocuments.reduce<Record<DocumentKey, UploadState>>(
    (acc, document) => {
      acc[document.key] = {
        loading: false,
        message: "",
        error: "",
        fileName: "",
      };
      return acc;
    },
    {} as Record<DocumentKey, UploadState>
  );
}

function getFileValidationError(file: File) {
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];

  if (!allowedTypes.includes(file.type)) {
    return "Sadece PDF, PNG veya JPG dosyaları yüklenebilir.";
  }

  if (file.size <= 0) {
    return "Boş dosya yüklenemez.";
  }

  if (file.size > maxFileSizeMb * 1024 * 1024) {
    return `Dosya boyutu en fazla ${maxFileSizeMb} MB olabilir.`;
  }

  return "";
}

function formatFileSize(bytes?: number | null) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return "";

  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mergeDocuments(apiDocuments: VerificationApiDocument[]) {
  return initialDocuments.map((document) => {
    const apiDocument = apiDocuments.find((item) => item.documentType === document.key);

    if (!apiDocument) return document;

    return {
      ...document,
      // Başlık, açıklama ve zorunluluk uzmanın mesleğine göre sunucudan gelir
      title: apiDocument.documentLabel || document.title,
      description: apiDocument.documentDescription || document.description,
      required: typeof apiDocument.required === "boolean" ? apiDocument.required : document.required,
      status: apiDocument.status || "missing",
      verificationId: apiDocument.verificationId || null,
      fileName: apiDocument.fileName || null,
      fileSize: apiDocument.fileSize || 0,
      adminNote: apiDocument.adminNote || null,
      reviewedAt: apiDocument.reviewedAt || null,
      createdAt: apiDocument.createdAt || null,
    };
  });
}

export default function ExpertVerificationPage() {
  const [documents, setDocuments] = useState<VerificationDocument[]>(initialDocuments);
  const [uploadStates, setUploadStates] = useState<Record<DocumentKey, UploadState>>(
    createInitialUploadState
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [summary, setSummary] = useState<VerificationApiResponse["summary"]>({});

  const progress = useMemo(
    () => Number(summary?.progress ?? getProgressValue(documents)),
    [documents, summary?.progress]
  );

  const requiredCounts = useMemo(() => getRequiredCounts(documents), [documents]);

  const pageStatusText = useMemo(() => {
    if (summary?.isVerified) {
      return "Zorunlu belgeleriniz onaylandı. Süreç tamamlandı.";
    }

    if (summary?.isReadyForReview) {
      return "Zorunlu belgeleriniz yüklendi. Mindora ekibi inceleme yapıyor.";
    }

    return "Zorunlu belgeleri yüklediğinizde inceleme süreci başlar.";
  }, [summary?.isReadyForReview, summary?.isVerified]);

  const fetchVerification = useCallback(async (mode: "initial" | "refresh" = "refresh") => {
    try {
      if (mode === "initial") setLoading(true);
      else setRefreshing(true);

      setNotice("");

      const response = await fetch("/api/expert/verification", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      const data = (await response.json().catch(() => ({}))) as VerificationApiResponse;

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Doğrulama bilgileri alınamadı.");
      }

      setDocuments(mergeDocuments(Array.isArray(data.documents) ? data.documents : []));
      setSummary(data.summary || {});
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Doğrulama bilgileri alınamadı.");
      setSummary({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchVerification("initial");
  }, [fetchVerification]);

  function updateUploadState(documentType: DocumentKey, patch: Partial<UploadState>) {
    setUploadStates((current) => ({
      ...current,
      [documentType]: {
        ...current[documentType],
        ...patch,
      },
    }));
  }

  function updateDocumentStatus(documentType: DocumentKey, status: DocumentStatus) {
    setDocuments((current) =>
      current.map((document) =>
        document.key === documentType ? { ...document, status } : document
      )
    );
  }

  async function uploadDocument(documentType: DocumentKey, file: File) {
    const validationError = getFileValidationError(file);

    if (validationError) {
      updateUploadState(documentType, {
        error: validationError,
        message: "",
        fileName: file.name,
      });
      return;
    }

    try {
      updateUploadState(documentType, {
        loading: true,
        error: "",
        message: "",
        fileName: file.name,
      });

      const formData = new FormData();
      formData.set("documentType", documentType);
      formData.set("file", file);

      const response = await fetch("/api/expert/verification/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || "Belge yüklenemedi.");
      }

      updateDocumentStatus(documentType, "pending");
      updateUploadState(documentType, {
        loading: false,
        error: "",
        message: data.message || "Belge başarıyla yüklendi ve incelemeye alındı.",
        fileName: file.name,
      });

      await fetchVerification("refresh");
    } catch (error) {
      updateUploadState(documentType, {
        loading: false,
        error: error instanceof Error ? error.message : "Belge yüklenemedi.",
        message: "",
        fileName: file.name,
      });
    }
  }

  return (
    <section className="px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-6 lg:p-8">
              <p className="text-sm font-semibold text-slate-400">
                Uzman Doğrulama
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Belge Yönetimi
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Mesleki belgelerinizi güvenli şekilde yükleyin. Belgeler yalnızca Mindora
                doğrulama ekibi tarafından incelenir ve danışanlarla paylaşılmaz.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">Güvenli dosya yükleme</StatusPill>
                <StatusPill tone="green">Admin inceleme süreci</StatusPill>
                <StatusPill>Belgeler gizli tutulur</StatusPill>
              </div>
            </div>

            <div className="border-t border-slate-200/80 bg-slate-50 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Zorunlu Belge Durumu</p>
                <button
                  type="button"
                  onClick={() => void fetchVerification("refresh")}
                  disabled={loading || refreshing}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading || refreshing ? "..." : "Yenile"}
                </button>
              </div>

              <div className="mt-3 flex items-end gap-2">
                <p className="text-4xl font-semibold tracking-tight text-slate-900">
                  {loading ? "..." : requiredCounts.submitted}
                </p>
                <p className="pb-1 text-sm font-semibold text-slate-500">
                  / {requiredCounts.total} yüklendi
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-slate-900"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>

              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                {pageStatusText}
              </p>
            </div>
          </div>
        </section>

        {notice ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="Belgeler"
            description={`PDF, PNG veya JPG formatında en fazla ${maxFileSizeMb} MB dosya yükleyebilirsiniz.`}
          >
            <div className="grid gap-4">
              {documents.map((document) => (
                <DocumentCard
                  key={document.key}
                  document={document}
                  uploadState={uploadStates[document.key]}
                  onUpload={uploadDocument}
                />
              ))}
            </div>
          </Panel>

          <Panel
            title="Süreç"
            description="Belgeleriniz yüklendikten sonra Mindora ekibi tarafından incelenir."
          >
            <div className="space-y-3">
              <TimelineItem
                title="Belgeleri yükleyin"
                description="Mesleğine göre zorunlu belgeler aşağıda işaretli."
                active
              />
              <TimelineItem
                title="İnceleme"
                description="Belgelerin okunabilirliği ve doğruluğu kontrol edilir."
                active={Boolean(summary?.isReadyForReview)}
              />
              <TimelineItem
                title="Tamamlandı"
                description="Zorunlu belgeler onaylandığında doğrulama süreci tamamlanır."
                active={Boolean(summary?.isVerified)}
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Gizlilik notu</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Belge dosyaları danışanlara gösterilmez. Dosyalar sadece doğrulama amacıyla
                yetkili ekip tarafından incelenir.
              </p>
            </div>
          </Panel>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Güvenli İnceleme</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Yüklenen belgeler private storage içinde saklanır. İnceleme süreci tamamlandığında
                durumunuz bu sayfada güncellenir.
              </p>
            </div>

            <Link
              href="/expert/dashboard/profile"
              className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 ease-out hover:border-slate-300 hover:text-slate-900"
            >
              Profile Dön
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

function DocumentCard({
  document,
  uploadState,
  onUpload,
}: {
  document: VerificationDocument;
  uploadState: UploadState;
  onUpload: (documentType: DocumentKey, file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    void onUpload(document.key, file);
    event.target.value = "";
  }

  const fileSize = formatFileSize(document.fileSize);
  const createdAt = formatDate(document.createdAt);
  const reviewedAt = formatDate(document.reviewedAt);
  const hasFileInfo = Boolean(document.fileName || fileSize || createdAt || reviewedAt);

  return (
    <article className="rounded-xl border border-slate-200/80 bg-slate-50 p-5 transition-all duration-200 ease-out hover:border-slate-300 hover:bg-white">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-lg">
              {getDocumentIcon(document.key)}
            </span>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">{document.title}</h3>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {document.required ? "Zorunlu belge" : "Opsiyonel belge"}
              </p>
            </div>

            <span className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(document.status)}`}>
              {getStatusLabel(document.status)}
            </span>
          </div>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            {document.description}
          </p>

          <p className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            {getStatusMessage(document.status)}
          </p>

          {hasFileInfo ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              {document.fileName ? (
                <p className="truncate text-xs font-semibold text-slate-700">
                  Dosya: {document.fileName}
                </p>
              ) : null}

              <p className="mt-1 text-xs font-semibold text-slate-500">
                {fileSize ? `${fileSize}` : ""}
                {fileSize && createdAt ? " · " : ""}
                {createdAt ? `Yüklenme: ${createdAt}` : ""}
                {(fileSize || createdAt) && reviewedAt ? " · " : ""}
                {reviewedAt ? `İnceleme: ${reviewedAt}` : ""}
              </p>

              {document.adminNote ? (
                <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  Admin notu: {document.adminNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {uploadState.fileName ? (
            <p className="mt-2 truncate text-xs font-semibold text-slate-500">
              Seçilen dosya: {uploadState.fileName}
            </p>
          ) : null}

          {uploadState.message ? (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {uploadState.message}
            </p>
          ) : null}

          {uploadState.error ? (
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {uploadState.error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
          <input
            ref={inputRef}
            type="file"
            accept={acceptedFileTypes}
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            disabled={uploadState.loading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex min-w-[150px] items-center justify-center rounded-full bg-pine-800 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-out hover:bg-pine-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadState.loading
              ? "Yükleniyor..."
              : document.status === "missing"
                ? "Dosya Seç"
                : "Yeniden Yükle"}
          </button>
        </div>
      </div>
    </article>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>

      {children}
    </section>
  );
}

function TimelineItem({
  title,
  description,
  active = false,
}: {
  title: string;
  description: string;
  active?: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200/80 bg-slate-50 p-4">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
          active
            ? "border-slate-300 bg-slate-100 text-slate-900"
            : "border-slate-200 bg-white text-slate-500"
        }`}
      >
        ✓
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function StatusPill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "green" | "blue";
}) {
  const className =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
