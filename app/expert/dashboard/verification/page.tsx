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
    description: "Lisans / yüksek lisans diploma belgenizi yükleyin.",
    status: "missing",
    required: true,
  },
  {
    key: "license",
    title: "Lisans / Yetkinlik Belgesi",
    description: "Mesleki yetkinlik, ruhsat veya resmi çalışma belgesi.",
    status: "missing",
    required: true,
  },
  {
    key: "certificate",
    title: "Uzmanlık Sertifikası",
    description: "Terapi ekolü, eğitim veya uzmanlık sertifikaları.",
    status: "missing",
    required: false,
  },
  {
    key: "identity",
    title: "Kimlik Doğrulama",
    description: "Admin incelemesi için opsiyonel kimlik doğrulama.",
    status: "missing",
    required: false,
  },
];

const acceptedFileTypes = ".pdf,.png,.jpg,.jpeg";
const maxFileSizeMb = 10;

function getStatusLabel(status: DocumentStatus) {
  if (status === "approved") return "Onaylandı";
  if (status === "pending") return "İncelemede";
  if (status === "rejected") return "Reddedildi";
  return "Eksik";
}

function getStatusClass(status: DocumentStatus) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "rejected") return "bg-rose-50 text-rose-700 ring-rose-100";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getProgressValue(items: VerificationDocument[]) {
  const requiredItems = items.filter((item) => item.required);
  if (requiredItems.length === 0) return 0;

  const completedItems = requiredItems.filter(
    (item) => item.status === "approved" || item.status === "pending"
  );

  return Math.round((completedItems.length / requiredItems.length) * 100);
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
    <section className="px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                C14 Uzman Doğrulama
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Doğrulama Merkezi
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                Diploma, lisans ve uzmanlık belgelerinizi güvenli şekilde yükleyin.
                Admin onayından sonra profilinizde doğrulanmış uzman güven rozeti gösterilir.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusPill tone="blue">Güven artırıcı profil</StatusPill>
                <StatusPill tone="green">Admin onay süreci</StatusPill>
                <StatusPill>Belgeler gizli tutulur</StatusPill>
                {summary?.isVerified ? <StatusPill tone="green">Doğrulama tamamlandı</StatusPill> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 lg:min-w-[320px]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-indigo-700">Doğrulama İlerlemesi</p>
                <button
                  type="button"
                  onClick={() => void fetchVerification("refresh")}
                  disabled={loading || refreshing}
                  className="rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-700 ring-1 ring-indigo-100 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading || refreshing ? "..." : "Yenile"}
                </button>
              </div>
              <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">%{loading ? "..." : progress}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-indigo-600"
                  style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-600">
                {summary?.isVerified
                  ? "Zorunlu belgeleriniz onaylandı. Profiliniz doğrulanmış uzman rozeti için hazır."
                  : summary?.isReadyForReview
                    ? "Zorunlu belgeler yüklendi ve admin incelemesi bekleniyor."
                    : "Zorunlu belgeler yüklendiğinde admin incelemesi başlatılır."}
              </p>
            </div>
          </div>
        </section>

        {notice ? (
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-black text-amber-900">
            {notice}
          </section>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Panel
            title="Belge Yükleme"
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
            title="Onay Süreci"
            description="Belgeleriniz admin ekibi tarafından incelendikten sonra doğrulama rozeti aktif edilir."
          >
            <div className="space-y-3">
              <TimelineItem
                title="1. Belgeleri yükle"
                description="Diploma ve lisans belgesi zorunludur."
                active
              />
              <TimelineItem
                title="2. Admin incelemesi"
                description="Belgelerin doğruluğu ve okunabilirliği kontrol edilir."
                active={Boolean(summary?.isReadyForReview)}
              />
              <TimelineItem
                title="3. Profil rozeti"
                description="Onay sonrası public profilinizde doğrulanmış uzman rozeti görünür."
                active={Boolean(summary?.isVerified)}
              />
            </div>

            <div className="mt-5 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-900">Gerçek durum senkronizasyonu aktif</p>
              <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800">
                Bu sayfa artık GET /api/expert/verification ile gerçek belge durumlarını, admin notlarını ve onay sonucunu gösterir.
              </p>
            </div>
          </Panel>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Gizlilik ve Güvenlik</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                Yüklenen belgeler yalnızca doğrulama amacıyla kullanılır. Danışan tarafında belge dosyaları değil,
                sadece doğrulama sonucu ve güven rozeti gösterilir.
              </p>
            </div>

            <Link
              href="/expert/dashboard/profile"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
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

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-50 hover:shadow-md">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-black text-slate-950">{document.title}</h3>
            {document.required ? (
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700 ring-1 ring-rose-100">
                Zorunlu
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                Opsiyonel
              </span>
            )}
            <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusClass(document.status)}`}>
              {getStatusLabel(document.status)}
            </span>
          </div>

          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
            {document.description}
          </p>

          {document.fileName ? (
            <div className="mt-3 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-200">
              <p className="truncate text-xs font-black text-slate-700">
                Yüklü dosya: {document.fileName}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {fileSize ? `${fileSize} · ` : ""}
                {createdAt ? `Yüklenme: ${createdAt}` : ""}
                {reviewedAt ? ` · İnceleme: ${reviewedAt}` : ""}
              </p>
              {document.adminNote ? (
                <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-100">
                  Admin notu: {document.adminNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {uploadState.fileName ? (
            <p className="mt-2 truncate text-xs font-bold text-slate-500">
              Seçilen dosya: {uploadState.fileName}
            </p>
          ) : null}

          {uploadState.message ? (
            <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
              {uploadState.message}
            </p>
          ) : null}

          {uploadState.error ? (
            <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 ring-1 ring-rose-100">
              {uploadState.error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
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
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {document.status === "missing" ? "Dosya Seç" : "Yeniden Yükle"}
          </button>

          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-300 px-5 py-3 text-sm font-black text-white"
          >
            {uploadState.loading ? "Yükleniyor..." : "Otomatik Yüklenir"}
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
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-slate-950">{title}</h2>
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
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <span
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ring-1 ${
          active
            ? "bg-indigo-50 text-indigo-700 ring-indigo-100"
            : "bg-white text-slate-500 ring-slate-200"
        }`}
      >
        ✓
      </span>
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
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
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-100"
        : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {children}
    </span>
  );
}
