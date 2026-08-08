"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { scoreExpertMatch } from "@/lib/matching/score-expert-match";

type ClientStatus =
  | "new"
  | "reviewing"
  | "matched"
  | "contacted"
  | "completed"
  | "cancelled";

type PaymentStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";
type ConversationStatus = "locked" | "active" | "closed";
type ConversationPaymentStatus = "pending" | "paid" | "failed" | "refunded";
type StatusFilter = "all" | ClientStatus;

type LatestPayment = {
  id: string;
  status: PaymentStatus;
  amount: number;
  commission_amount: number;
  expert_amount: number;
  payment_page_url: string | null;
  iyzico_payment_id: string | null;
  expert_payout_status: string | null;
  expert_payout_paid_at: string | null;
  created_at: string;
};

type LatestConversation = {
  id: string;
  status: ConversationStatus;
  payment_status: ConversationPaymentStatus;
  created_at: string;
  updated_at: string;
};

type Client = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  age: string | null;
  topic: string | null;
  duration: string | null;
  previous_support: string | null;
  start_time: string | null;
  preference: string | null;
  availability: string | null;
  note: string | null;
  status: ClientStatus;
  matched_expert_id: string | null;
  created_at: string;
  latest_payment: LatestPayment | null;
  latest_conversation?: LatestConversation | null;
  conversation?: LatestConversation | null;
};

type Expert = {
  id: string;
  name: string;
  title: string | null;
  areas: string | null;
  availability: string | null;
  experience: string | null;
  status: "pending" | "approved" | "rejected" | "passive";
};

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "new", label: "Yeni" },
  { value: "reviewing", label: "İncelemede" },
  { value: "matched", label: "Eşleşti" },
  { value: "contacted", label: "İletişime Geçildi" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal" },
];

function getStatusLabel(status: ClientStatus) {
  const labels: Record<ClientStatus, string> = {
    new: "Yeni",
    reviewing: "İncelemede",
    matched: "Eşleşti",
    contacted: "İletişime Geçildi",
    completed: "Tamamlandı",
    cancelled: "İptal",
  };

  return labels[status] || "Bilinmiyor";
}

function getStatusStyle(status: ClientStatus) {
  const styles: Record<ClientStatus, string> = {
    new: "bg-sky-50 text-sky-700 ring-sky-100",
    reviewing: "bg-amber-50 text-amber-700 ring-amber-100",
    matched: "bg-violet-50 text-violet-700 ring-violet-100",
    contacted: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-100",
  };

  return styles[status] || "bg-slate-100 text-slate-700 ring-slate-200";
}

function getPaymentLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    pending: "Ödeme Bekliyor",
    paid: "Ödendi",
    failed: "Başarısız",
    cancelled: "İptal",
    refunded: "İade",
  };

  return labels[status] || "Bilinmiyor";
}

function getPaymentStyle(status: PaymentStatus) {
  const styles: Record<PaymentStatus, string> = {
    pending: "bg-amber-50 text-amber-800 ring-amber-100",
    paid: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    failed: "bg-rose-50 text-rose-800 ring-rose-100",
    cancelled: "bg-slate-100 text-slate-700 ring-slate-200",
    refunded: "bg-sky-50 text-sky-800 ring-sky-100",
  };

  return styles[status] || "bg-slate-100 text-slate-700 ring-slate-200";
}

function getConversationLabel(status?: ConversationStatus | null) {
  if (status === "locked") return "Sohbet Kilitli";
  if (status === "active") return "Sohbet Aktif";
  if (status === "closed") return "Sohbet Kapalı";

  return "Sohbet Yok";
}

function getConversationStyle(status?: ConversationStatus | null) {
  if (status === "locked") return "bg-orange-50 text-orange-800 ring-orange-100";
  if (status === "active") return "bg-emerald-50 text-emerald-800 ring-emerald-100";
  if (status === "closed") return "bg-slate-100 text-slate-700 ring-slate-200";

  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function safeText(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatMoney(value: number | null | undefined) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) return "-";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(numberValue);
}

function getClientConversation(client: Client) {
  return client.latest_conversation || client.conversation || null;
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function DanisanBasvurulariPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);
  const [copiedClientId, setCopiedClientId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 10;

  const approvedExperts = useMemo(
    () => experts.filter((expert) => expert.status === "approved"),
    [experts]
  );

  const getRankedExperts = useCallback(
    (client: Client) => {
      return approvedExperts
        .map((expert) => ({
          expert,
          match: scoreExpertMatch(
            { topic: client.topic, availability: client.availability },
            { areas: expert.areas, availability: expert.availability, experience: expert.experience }
          ),
        }))
        .sort((a, b) => b.match.score - a.match.score);
    },
    [approvedExperts]
  );

  const counts = useMemo(() => {
    return {
      all: clients.length,
      new: clients.filter((client) => client.status === "new").length,
      reviewing: clients.filter((client) => client.status === "reviewing").length,
      matched: clients.filter((client) => client.status === "matched").length,
      contacted: clients.filter((client) => client.status === "contacted").length,
      completed: clients.filter((client) => client.status === "completed").length,
      cancelled: clients.filter((client) => client.status === "cancelled").length,
    };
  }, [clients]);

  const chatSummary = useMemo(() => {
    const conversations = clients
      .map((client) => getClientConversation(client))
      .filter(Boolean) as LatestConversation[];

    return {
      total: conversations.length,
      active: conversations.filter((conversation) => conversation.status === "active").length,
      locked: conversations.filter((conversation) => conversation.status === "locked").length,
      closed: conversations.filter((conversation) => conversation.status === "closed").length,
    };
  }, [clients]);

  const paymentSummary = useMemo(() => {
    const payments = clients
      .map((client) => client.latest_payment)
      .filter(Boolean) as LatestPayment[];

    const paidPayments = payments.filter((payment) => payment.status === "paid");
    const pendingPayments = payments.filter((payment) => payment.status === "pending");

    return {
      count: payments.length,
      paidCount: paidPayments.length,
      pendingCount: pendingPayments.length,
      paidAmount: paidPayments.reduce((sum, payment) => sum + payment.amount, 0),
      paidCommission: paidPayments.reduce(
        (sum, payment) => sum + payment.commission_amount,
        0
      ),
      paidExpertAmount: paidPayments.reduce(
        (sum, payment) => sum + payment.expert_amount,
        0
      ),
    };
  }, [clients]);

  function getExpertName(expertId: string | null) {
    if (!expertId) return "-";

    const expert = experts.find((item) => item.id === expertId);

    return expert ? expert.name : expertId;
  }

  const filteredClients = useMemo(() => {
    const keyword = normalizeText(search);

    return clients.filter((client) => {
      const statusMatch = filter === "all" || client.status === filter;
      const conversation = getClientConversation(client);

      const text = [
        client.name,
        client.phone,
        client.email,
        client.age,
        client.topic,
        client.duration,
        client.preference,
        client.availability,
        client.note,
        getExpertName(client.matched_expert_id),
        client.latest_payment?.status,
        client.latest_payment?.iyzico_payment_id,
        conversation?.id,
        conversation?.status,
        conversation?.payment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const searchMatch = !keyword || text.includes(keyword);

      return statusMatch && searchMatch;
    });
  }, [clients, filter, search, experts]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedClients = useMemo(
    () => filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredClients, currentPage]
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [clientsResponse, expertsResponse] = await Promise.all([
        fetch("/api/admin/clients", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
        fetch("/api/admin/experts", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        }),
      ]);

      const clientsData = (await clientsResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        clients?: Client[];
        error?: string;
      };

      const expertsData = (await expertsResponse.json().catch(() => ({}))) as {
        ok?: boolean;
        experts?: Expert[];
        error?: string;
      };

      if (!clientsResponse.ok || clientsData.ok === false) {
        setError(clientsData.error || "Danışan başvuruları alınamadı.");
        return;
      }

      if (!expertsResponse.ok || expertsData.ok === false) {
        setError(expertsData.error || "Uzman listesi alınamadı.");
        return;
      }

      setClients(Array.isArray(clientsData.clients) ? clientsData.clients : []);
      setExperts(Array.isArray(expertsData.experts) ? expertsData.experts : []);
    } catch {
      setError("Sunucuya bağlanırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  async function updateStatus(id: string, status: ClientStatus) {
    try {
      setUpdatingId(id);

      const response = await fetch("/api/admin/clients/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        window.alert(data.error || "Danışan durumu güncellenemedi.");
        return;
      }

      await fetchData();
    } catch {
      window.alert("Durum güncellenirken hata oluştu.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function matchClient(clientId: string) {
    const expertId = selectedExperts[clientId];

    if (!expertId) {
      window.alert("Lütfen önce bir uzman seç.");
      return;
    }

    try {
      setUpdatingId(clientId);

      const response = await fetch("/api/admin/clients/match", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ clientId, expertId }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || data.ok === false) {
        window.alert(data.error || "Eşleştirme başarısız.");
        return;
      }

      setSelectedExperts((prev) => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });

      await fetchData();
    } catch {
      window.alert("Eşleştirme sırasında hata oluştu.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function createPaymentLink(client: Client) {
    if (!client.matched_expert_id) {
      window.alert("Ödeme linki oluşturmadan önce danışanı bir uzmanla eşleştir.");
      return;
    }

    if (client.latest_payment?.status === "paid") {
      window.alert("Bu danışanın ödemesi zaten tamamlanmış.");
      return;
    }

    try {
      setPaymentLoadingId(client.id);

      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ clientId: client.id }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        paymentPageUrl?: string;
      };

      if (!response.ok || data.ok === false) {
        window.alert(data.error || "Ödeme linki oluşturulamadı.");
        return;
      }

      if (data.paymentPageUrl) {
        await navigator.clipboard.writeText(data.paymentPageUrl);
        setCopiedClientId(client.id);
        setTimeout(() => setCopiedClientId(null), 2500);
        window.open(data.paymentPageUrl, "_blank", "noopener,noreferrer");
      }

      await fetchData();
    } catch {
      window.alert("Ödeme linki oluşturulurken hata oluştu.");
    } finally {
      setPaymentLoadingId(null);
    }
  }

  async function copyPaymentLink(client: Client) {
    const link = client.latest_payment?.payment_page_url;

    if (!link) return;

    await navigator.clipboard.writeText(link);
    setCopiedClientId(client.id);
    setTimeout(() => setCopiedClientId(null), 2500);
  }

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Danışan Başvuruları
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Başvuruları incele, uzman eşleştir, ödeme linki oluştur ve ödeme
                sonrası sohbet durumunu tek ekrandan takip et.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                Yönetim Merkezi
              </Link>
              <button
                type="button"
                onClick={() => void fetchData()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Yükleniyor..." : "Yenile"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Ödeme Kaydı" value={String(paymentSummary.count)} description={`Bekleyen: ${paymentSummary.pendingCount}`} />
          <SummaryCard title="Ödenen Toplam" value={formatMoney(paymentSummary.paidAmount)} description={`Ödenen işlem: ${paymentSummary.paidCount}`} />
          <SummaryCard title="Komisyon" value={formatMoney(paymentSummary.paidCommission)} description="Mindora payı" />
          <SummaryCard title="Sohbet Aktif" value={String(chatSummary.active)} description={`Kilitli: ${chatSummary.locked} • Toplam: ${chatSummary.total}`} />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setFilter(option.value);
                setPage(1);
              }}
              className={`rounded-2xl px-4 py-3 text-sm font-black ring-1 transition-all duration-200 ${
                filter === option.value
                  ? "bg-slate-950 text-white ring-slate-950"
                  : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
              }`}
            >
              {option.label} ({counts[option.value]})
            </button>
          ))}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="İsim, telefon, e-posta, konu, uzman, ödeme numarası, konuşma numarası veya not ara..."
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
          />
        </section>

        {loading ? (
          <StateBox title="Danışan başvuruları yükleniyor" description="Kayıtlar hazırlanıyor." />
        ) : error ? (
          <StateBox tone="error" title="Başvurular alınamadı" description={error} />
        ) : filteredClients.length === 0 ? (
          <StateBox
            title="Kayıt bulunamadı"
            description="Bu filtre veya arama için danışan başvurusu bulunmuyor."
          />
        ) : (
          <section className="grid gap-5">
            {paginatedClients.map((client) => {
              const payment = client.latest_payment;
              const conversation = getClientConversation(client);
              const canCreatePayment = Boolean(client.matched_expert_id);
              const canOpenPaymentLink =
                payment?.status === "pending" && Boolean(payment.payment_page_url);
              const chatShouldBeActive =
                payment?.status === "paid" || conversation?.payment_status === "paid";

              return (
                <article
                  key={client.id}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black text-slate-950">
                          {safeText(client.name)}
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStatusStyle(
                            client.status
                          )}`}
                        >
                          {getStatusLabel(client.status)}
                        </span>

                        {payment ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getPaymentStyle(
                              payment.status
                            )}`}
                          >
                            {getPaymentLabel(payment.status)}
                          </span>
                        ) : canCreatePayment ? (
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                            Ödeme Linki Yok
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                            Önce Uzman Ata
                          </span>
                        )}

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getConversationStyle(
                            conversation?.status
                          )}`}
                        >
                          {getConversationLabel(conversation?.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-600">
                        {safeText(client.topic)} • {safeText(client.age)}
                      </p>

                      <p className="mt-2 text-xs font-bold text-slate-400">
                        Başvuru tarihi: {formatDate(client.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatusButton
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, "reviewing")}
                      >
                        İncelemede
                      </StatusButton>
                      <StatusButton
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, "contacted")}
                      >
                        İletişime Geçildi
                      </StatusButton>
                      <StatusButton
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, "completed")}
                      >
                        Tamamlandı
                      </StatusButton>
                      <StatusButton
                        tone="danger"
                        disabled={updatingId === client.id}
                        onClick={() => updateStatus(client.id, "cancelled")}
                      >
                        İptal
                      </StatusButton>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 rounded-3xl bg-slate-50 p-5 text-sm text-slate-700 ring-1 ring-slate-200 md:grid-cols-2">
                    <InfoRow label="Telefon" value={safeText(client.phone)} />
                    <InfoRow label="E-posta" value={safeText(client.email)} />
                    <InfoRow label="Yaş" value={safeText(client.age)} />
                    <InfoRow label="Destek Konusu" value={safeText(client.topic)} />
                    <InfoRow label="Süre" value={safeText(client.duration)} />
                    <InfoRow label="Daha Önce Destek" value={safeText(client.previous_support)} />
                    <InfoRow label="Başlama Zamanı" value={safeText(client.start_time)} />
                    <InfoRow label="Psikolog Tercihi" value={safeText(client.preference)} />
                    <InfoRow label="Müsaitlik" value={safeText(client.availability)} />
                    <InfoRow
                      label="Eşleşen Uzman"
                      value={getExpertName(client.matched_expert_id)}
                      className="md:col-span-2"
                    />
                    <InfoRow label="Ek Not" value={safeText(client.note)} className="md:col-span-2" />
                  </div>

                  <div className="mt-5 grid gap-5 xl:grid-cols-3">
                    <section className="rounded-3xl border border-violet-100 bg-violet-50 p-4">
                      <p className="text-sm font-black text-violet-950">Uzman Eşleştirme</p>
                      <p className="mt-1 text-xs font-semibold text-violet-800">
                        Danışanı onaylı bir uzmanla eşleştir.
                      </p>

                      <div className="mt-4 flex flex-col gap-3">
                        <select
                          value={selectedExperts[client.id] || ""}
                          onChange={(event) =>
                            setSelectedExperts((prev) => ({
                              ...prev,
                              [client.id]: event.target.value,
                            }))
                          }
                          className="min-h-12 rounded-2xl border border-violet-100 bg-white px-4 text-sm font-semibold text-violet-950 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                        >
                          <option value="">Onaylı uzman seç (uyum skoruna göre sıralı)</option>

                          {getRankedExperts(client).map(({ expert, match }) => (
                            <option key={expert.id} value={expert.id}>
                              {match.score > 0 ? `%${match.score} uyum • ` : ""}
                              {expert.name}
                              {expert.title ? ` • ${expert.title}` : ""}
                              {expert.areas ? ` • ${expert.areas}` : ""}
                            </option>
                          ))}
                        </select>

                        {selectedExperts[client.id]
                          ? (() => {
                              const picked = getRankedExperts(client).find(
                                ({ expert }) => expert.id === selectedExperts[client.id]
                              );

                              if (!picked || picked.match.reasons.length === 0) return null;

                              return (
                                <p className="text-xs font-semibold text-violet-800">
                                  {picked.match.reasons.join(" • ")}
                                </p>
                              );
                            })()
                          : null}

                        <button
                          type="button"
                          disabled={
                            updatingId === client.id ||
                            !selectedExperts[client.id] ||
                            approvedExperts.length === 0
                          }
                          onClick={() => matchClient(client.id)}
                          className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Uzman Ata
                        </button>
                      </div>

                      {approvedExperts.length === 0 ? (
                        <p className="mt-3 text-sm font-semibold text-rose-700">
                          Onaylı uzman yok. Önce Uzman Başvuruları sayfasından bir uzmanı onayla.
                        </p>
                      ) : null}
                    </section>

                    <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-emerald-950">
                            Ödeme Yönetimi
                          </p>
                          <p className="mt-1 text-xs font-semibold text-emerald-800">
                            Ödeme linkini oluştur, kopyala ve durumunu takip et.
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                          {payment ? getPaymentLabel(payment.status) : canCreatePayment ? "Link Yok" : "Kapalı"}
                        </span>
                      </div>

                      {payment ? (
                        <div className="mt-4 space-y-3">
                          <div className="grid gap-2 text-sm text-emerald-950 sm:grid-cols-3">
                            <InfoAmount label="Tutar" value={formatMoney(payment.amount)} />
                            <InfoAmount label="Komisyon" value={formatMoney(payment.commission_amount)} />
                            <InfoAmount label="Uzman Payı" value={formatMoney(payment.expert_amount)} />
                          </div>

                          <div className="rounded-2xl bg-white p-3 text-xs font-semibold text-emerald-950 ring-1 ring-emerald-100">
                            <InfoRow label="Durum" value={getPaymentLabel(payment.status)} />
                            <InfoRow label="Tarih" value={formatDate(payment.created_at)} />
                            <InfoRow label="iyzico" value={safeText(payment.iyzico_payment_id)} className="break-all" />
                            {payment.payment_page_url ? (
                              <InfoRow label="Link" value={payment.payment_page_url} className="break-all" />
                            ) : null}
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            {canOpenPaymentLink ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => copyPaymentLink(client)}
                                  className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-800"
                                >
                                  {copiedClientId === client.id ? "Kopyalandı" : "Linki Kopyala"}
                                </button>

                                <a
                                  href={payment.payment_page_url || "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-center text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
                                >
                                  Linki Aç
                                </a>
                              </>
                            ) : null}

                            {payment.status !== "paid" && !canOpenPaymentLink ? (
                              <button
                                type="button"
                                disabled={!canCreatePayment || paymentLoadingId === client.id}
                                onClick={() => createPaymentLink(client)}
                                className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Yeni Link Oluştur
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <button
                            type="button"
                            disabled={!canCreatePayment || paymentLoadingId === client.id}
                            onClick={() => createPaymentLink(client)}
                            className="w-full rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {paymentLoadingId === client.id
                              ? "Ödeme Linki Oluşturuluyor..."
                              : "Ödeme Linki Oluştur"}
                          </button>

                          {!canCreatePayment ? (
                            <p className="mt-3 text-xs font-semibold text-rose-700">
                              Ödeme linki için önce danışanı onaylı bir uzmanla eşleştir.
                            </p>
                          ) : null}
                        </div>
                      )}
                    </section>

                    <section className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-sky-950">Platform İçi Sohbet</p>
                          <p className="mt-1 text-xs font-semibold text-sky-800">
                            Ödeme sonrası danışan ve uzman iletişimini takip et.
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getConversationStyle(
                            conversation?.status
                          )}`}
                        >
                          {getConversationLabel(conversation?.status)}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white p-3 text-xs font-semibold text-sky-950 ring-1 ring-sky-100">
                        <InfoRow label="Konuşma ID" value={conversation?.id || "-"} className="break-all" />
                        <InfoRow label="Sohbet Durumu" value={getConversationLabel(conversation?.status)} />
                        <InfoRow
                          label="Ödeme Kilidi"
                          value={
                            conversation?.payment_status === "paid"
                              ? "Ödeme tamamlandı"
                              : conversation?.payment_status === "failed"
                                ? "Ödeme başarısız"
                                : "Ödeme bekleniyor"
                          }
                        />
                        <InfoRow label="Son Güncelleme" value={formatDate(conversation?.updated_at)} />
                      </div>

                      <div className="mt-4 rounded-2xl bg-white/80 p-3 text-xs font-semibold text-sky-900 ring-1 ring-sky-100">
                        {conversation ? (
                          chatShouldBeActive && conversation.status === "active" ? (
                            <p>✅ Sohbet aktif. Danışan ve uzman platform içinden görüşmeye hazır.</p>
                          ) : conversation.status === "locked" ? (
                            <p>🔒 Sohbet kilitli. Ödeme tamamlanınca otomatik aktif olur.</p>
                          ) : (
                            <p>⚠️ Sohbet kapalı veya manuel inceleme gerektiriyor.</p>
                          )
                        ) : client.matched_expert_id ? (
                          <p>
                            ⚠️ Eşleşme var ama konuşma görünmüyor. Eşleştirme servisi veya danışan
                            listesi yanıtı kontrol edilmeli.
                          </p>
                        ) : (
                          <p>Önce uzman atanmalı. Uzman atanırken konuşma otomatik oluşturulur.</p>
                        )}
                      </div>

                      {conversation?.id ? (
                        <Link
                          href={`/admin/conversations/${conversation.id}`}
                          className="mt-4 block rounded-2xl bg-sky-700 px-4 py-2 text-center text-sm font-black text-white transition hover:bg-sky-800"
                        >
                          Konuşmayı Aç
                        </Link>
                      ) : null}
                    </section>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!loading && !error && filteredClients.length > PAGE_SIZE ? (
          <section className="flex flex-col items-center justify-between gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:flex-row">
            <p className="text-sm font-semibold text-slate-500">
              Sayfa {currentPage} / {totalPages} • Toplam {filteredClients.length} kayıt
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 break-words text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function InfoRow({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <p className={className}>
      <span className="font-black text-slate-900">{label}:</span> {value}
    </p>
  );
}

function InfoAmount({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-black">{label}:</span>
      <br />
      {value}
    </p>
  );
}

function StatusButton({
  children,
  disabled,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  tone?: "default" | "danger";
}) {
  const className =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-slate-700 hover:bg-slate-800";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function StateBox({
  title,
  description,
  tone = "neutral",
}: {
  title: string;
  description: string;
  tone?: "neutral" | "error";
}) {
  const className =
    tone === "error"
      ? "border-rose-100 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-600";

  return (
    <section className={`rounded-[2rem] border p-8 text-center shadow-sm ${className}`}>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-sm font-semibold">{description}</p>
    </section>
  );
}
