"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { createMindoraRealtimeClient } from "@/lib/supabase/realtime";

type SenderType = "client" | "expert" | "admin";
type UserPresenceType = "client" | "expert" | "admin";
type FilterType = "all" | "unread" | "active" | "locked" | "paid" | "online";

type Conversation = {
  id: string;
  status: "locked" | "active" | "closed";
  payment_status: "pending" | "paid" | "failed" | "refunded";
  created_at: string;
  updated_at: string;
  unreadCount?: number;
  last_message?: string | null;
  last_message_sender?: SenderType | null;
  last_message_sender_name?: string | null;
  last_message_at?: string | null;

  client_access_token?: string | null;
  expert_access_token?: string | null;
  clientAccessToken?: string | null;
  expertAccessToken?: string | null;
  client_token?: string | null;
  expert_token?: string | null;
};

type PresenceState = {
  client: boolean;
  expert: boolean;
};

const filterOptions: Array<{ value: FilterType; label: string }> = [
  { value: "all", label: "Tümü" },
  { value: "unread", label: "Okunmamış" },
  { value: "active", label: "Aktif" },
  { value: "locked", label: "Kilitli" },
  { value: "paid", label: "Ödenmiş" },
  { value: "online", label: "Online" },
];

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTimeValue(value?: string | null) {
  if (!value) return 0;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function getStatusText(status?: string) {
  if (status === "active") return "Aktif";
  if (status === "locked") return "Kilitli";
  if (status === "closed") return "Kapalı";

  return "-";
}

function getStatusClass(status?: string) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "locked") return "bg-slate-950 text-white ring-slate-950";
  if (status === "closed") return "bg-slate-100 text-slate-700 ring-slate-200";

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getPaymentText(status?: string) {
  if (status === "paid") return "Ödendi";
  if (status === "pending") return "Bekliyor";
  if (status === "failed") return "Başarısız";
  if (status === "refunded") return "İade";

  return "-";
}

function getPaymentClass(status?: string) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-100";
  if (status === "failed") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (status === "refunded") return "bg-sky-50 text-sky-700 ring-sky-100";

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getSenderText(sender?: SenderType | null) {
  if (sender === "client") return "Danışan";
  if (sender === "expert") return "Uzman";
  if (sender === "admin") return "Mindora";

  return "Mesaj yok";
}

function getSenderBadgeClass(sender?: SenderType | null) {
  if (sender === "client") return "bg-sky-50 text-sky-700 ring-sky-100";
  if (sender === "expert") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (sender === "admin") return "bg-slate-950 text-white ring-slate-950";

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getPreviewText(message?: string | null) {
  if (!message) return "Henüz mesaj yok.";

  const clean = message.replace(/\s+/g, " ").trim();

  if (clean.length <= 120) return clean;

  return `${clean.slice(0, 120)}...`;
}

function getClientToken(conversation: Conversation) {
  return (
    conversation.client_access_token ||
    conversation.clientAccessToken ||
    conversation.client_token ||
    ""
  );
}

function getExpertToken(conversation: Conversation) {
  return (
    conversation.expert_access_token ||
    conversation.expertAccessToken ||
    conversation.expert_token ||
    ""
  );
}

function buildChatUrl(userType: "client" | "expert", conversationId: string, token: string) {
  const basePath =
    userType === "client"
      ? `/client/chat/${conversationId}`
      : `/expert/chat/${conversationId}`;

  if (!token) return basePath;

  return `${basePath}?token=${encodeURIComponent(token)}`;
}

function parsePresenceState(rawState: Record<string, unknown[]>): PresenceState {
  const next: PresenceState = {
    client: false,
    expert: false,
  };

  Object.values(rawState).forEach((items) => {
    items.forEach((item) => {
      const presence = item as {
        userType?: UserPresenceType;
        user_type?: UserPresenceType;
        role?: UserPresenceType;
      };

      const userType = presence.userType || presence.user_type || presence.role;

      if (userType === "client") next.client = true;
      if (userType === "expert") next.expert = true;
    });
  });

  return next;
}

function PresencePill({ label, online }: { label: string; online: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${
        online
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-slate-100 text-slate-500 ring-slate-200"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {label} {online ? "online" : "offline"}
    </span>
  );
}

export default function AdminConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceState>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const isMountedRef = useRef(true);
  const conversationsRef = useRef<Conversation[]>([]);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hubChannelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>["channel"]
  > | null>(null);

  const presenceChannelsRef = useRef<
    Record<string, ReturnType<ReturnType<typeof createMindoraRealtimeClient>["channel"]>>
  >({});

  const supabaseRef = useRef<ReturnType<typeof createMindoraRealtimeClient> | null>(null);

  const totalUnread = useMemo(() => {
    return conversations.reduce((total, conversation) => {
      return total + (conversation.unreadCount || 0);
    }, 0);
  }, [conversations]);

  const activeCount = useMemo(() => {
    return conversations.filter((conversation) => conversation.status === "active").length;
  }, [conversations]);

  const paidCount = useMemo(() => {
    return conversations.filter((conversation) => conversation.payment_status === "paid").length;
  }, [conversations]);

  const secureLinkReadyCount = useMemo(() => {
    return conversations.filter((conversation) => {
      return Boolean(getClientToken(conversation) && getExpertToken(conversation));
    }).length;
  }, [conversations]);

  const onlineSummary = useMemo(() => {
    return conversations.reduce(
      (total, conversation) => {
        const state = presenceMap[conversation.id];

        if (state?.client) total.clients += 1;
        if (state?.expert) total.experts += 1;

        return total;
      },
      { clients: 0, experts: 0 }
    );
  }, [conversations, presenceMap]);

  const filteredConversations = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return conversations
      .filter((conversation) => {
        const presence = presenceMap[conversation.id];
        const hasUnread = (conversation.unreadCount || 0) > 0;

        if (filter === "unread" && !hasUnread) return false;
        if (filter === "active" && conversation.status !== "active") return false;
        if (filter === "locked" && conversation.status !== "locked") return false;
        if (filter === "paid" && conversation.payment_status !== "paid") return false;
        if (filter === "online" && !presence?.client && !presence?.expert) return false;

        if (!searchText) return true;

        const haystack = [
          conversation.id,
          conversation.last_message,
          conversation.last_message_sender,
          conversation.last_message_sender_name,
          conversation.status,
          conversation.payment_status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(searchText);
      })
      .sort((a, b) => {
        const unreadDiff = (b.unreadCount || 0) - (a.unreadCount || 0);
        if (unreadDiff !== 0) return unreadDiff;

        const bTime = getTimeValue(b.last_message_at || b.updated_at);
        const aTime = getTimeValue(a.last_message_at || a.updated_at);

        return bTime - aTime;
      });
  }, [conversations, filter, presenceMap, search]);

  const cleanupPresenceChannels = useCallback((idsToKeep: string[] = []) => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    const keepSet = new Set(idsToKeep);

    Object.entries(presenceChannelsRef.current).forEach(([conversationId, channel]) => {
      if (keepSet.has(conversationId)) return;

      try {
        channel.untrack();
        supabase.removeChannel(channel);
      } catch (error) {
        console.error("ADMIN HUB PRESENCE CLEANUP ERROR:", error);
      }

      delete presenceChannelsRef.current[conversationId];
    });

    setPresenceMap((current) => {
      const next = { ...current };

      Object.keys(next).forEach((conversationId) => {
        if (!keepSet.has(conversationId)) delete next[conversationId];
      });

      return next;
    });
  }, []);

  const setupPresenceChannels = useCallback(
    (list: Conversation[]) => {
      const supabase = supabaseRef.current;
      if (!supabase) return;

      const conversationIds = list.map((conversation) => conversation.id);

      cleanupPresenceChannels(conversationIds);

      conversationIds.forEach((conversationId) => {
        if (presenceChannelsRef.current[conversationId]) return;

        const channel = supabase.channel(`mindora-conversation-${conversationId}`, {
          config: {
            presence: {
              key: `admin-hub-${conversationId}`,
            },
          },
        });

        channel
          .on("presence", { event: "sync" }, () => {
            if (!isMountedRef.current) return;

            const rawState = channel.presenceState();
            const nextState = parsePresenceState(rawState);

            setPresenceMap((current) => ({
              ...current,
              [conversationId]: nextState,
            }));
          })
          .subscribe(async (status) => {
            if (status !== "SUBSCRIBED") return;

            try {
              await channel.track({
                userType: "admin",
                user_type: "admin",
                role: "admin",
                page: "admin_conversations_hub",
                conversationId,
                conversation_id: conversationId,
                onlineAt: new Date().toISOString(),
                online_at: new Date().toISOString(),
              });
            } catch (error) {
              console.error("ADMIN HUB PRESENCE TRACK ERROR:", error);
            }
          });

        presenceChannelsRef.current[conversationId] = channel;
      });
    },
    [cleanupPresenceChannels]
  );

  const loadConversations = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);

        setRefreshing(true);
        setError("");

        const response = await fetch("/api/admin/conversations", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.ok) {
          setError(data?.error || "Konuşmalar alınamadı.");
          return;
        }

        const list: Conversation[] = Array.isArray(data.conversations)
          ? data.conversations
          : [];

        const withUnread = await Promise.all(
          list.map(async (conversation) => {
            try {
              const unreadResponse = await fetch(
                `/api/conversations/${conversation.id}/unread?userType=admin`,
                {
                  method: "GET",
                  cache: "no-store",
                  headers: { Accept: "application/json" },
                }
              );

              const unreadData = await unreadResponse.json().catch(() => null);

              return {
                ...conversation,
                unreadCount: Number(unreadData?.unreadCount || 0),
              };
            } catch {
              return {
                ...conversation,
                unreadCount: 0,
              };
            }
          })
        );

        if (!isMountedRef.current) return;

        conversationsRef.current = withUnread;
        setConversations(withUnread);
        setupPresenceChannels(withUnread);
      } catch {
        if (isMountedRef.current) setError("Sunucu bağlantı hatası.");
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [setupPresenceChannels]
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    refreshTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      void loadConversations(false);
    }, 350);
  }, [loadConversations]);

  useEffect(() => {
    isMountedRef.current = true;
    supabaseRef.current = createMindoraRealtimeClient();

    void loadConversations(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [loadConversations]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    try {
      const channel = supabase
        .channel("admin-conversations-hub")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          () => {
            if (!isMountedRef.current) return;
            scheduleRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversations",
          },
          () => {
            if (!isMountedRef.current) return;
            scheduleRefresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "conversation_reads",
          },
          () => {
            if (!isMountedRef.current) return;
            scheduleRefresh();
          }
        )
        .subscribe();

      hubChannelRef.current = channel;

      return () => {
        if (hubChannelRef.current) supabase.removeChannel(hubChannelRef.current);
        hubChannelRef.current = null;
      };
    } catch (error) {
      console.error("ADMIN HUB REALTIME ERROR:", error);
    }
  }, [scheduleRefresh]);

  useEffect(() => {
    return () => {
      const supabase = supabaseRef.current;

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (supabase && hubChannelRef.current) {
        try {
          supabase.removeChannel(hubChannelRef.current);
        } catch {}
      }

      if (supabase) {
        Object.values(presenceChannelsRef.current).forEach((channel) => {
          try {
            channel.untrack();
            supabase.removeChannel(channel);
          } catch {}
        });
      }

      hubChannelRef.current = null;
      presenceChannelsRef.current = {};
      supabaseRef.current = null;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <AdminHeader />

        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600">
                Yönetim Merkezi
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Sohbet Yönetimi
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Son mesajları, okunmamış durumları, ödeme kilidini, online kullanıcıları ve güvenli
                test bağlantılarını tek ekrandan takip et.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadConversations(false)}
              disabled={loading || refreshing}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Yenileniyor..." : "Yenile"}
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard title="Toplam Konuşma" value={String(conversations.length)} description="Sistemdeki konuşmalar" />
          <SummaryCard title="Aktif Konuşma" value={String(activeCount)} description="Sohbeti açık olanlar" />
          <SummaryCard title="Ödenmiş" value={String(paidCount)} description="Ödeme tamamlananlar" />
          <SummaryCard title="Okunmamış" value={String(totalUnread)} description="Toplam okunmamış mesaj" />
          <SummaryCard title="Danışan Online" value={String(onlineSummary.clients)} description="Anlık çevrimiçi" />
          <SummaryCard title="Uzman Online" value={String(onlineSummary.experts)} description="Anlık çevrimiçi" />
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Konuşma numarası, mesaj, durum veya gönderen ara..."
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50"
            />

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={`rounded-2xl px-4 py-2 text-xs font-black ring-1 transition-all duration-200 ${
                    filter === item.value
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-white text-slate-700 ring-slate-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill className="bg-emerald-50 text-emerald-700 ring-emerald-100">
              Gerçek zamanlı takip aktif
            </StatusPill>
            <StatusPill
              className={
                refreshing
                  ? "bg-amber-50 text-amber-700 ring-amber-100"
                  : "bg-slate-100 text-slate-600 ring-slate-200"
              }
            >
              {refreshing ? "Güncelleniyor..." : "Senkron"}
            </StatusPill>
            <StatusPill className="bg-sky-50 text-sky-700 ring-sky-100">
              {secureLinkReadyCount} güvenli test bağlantısı hazır
            </StatusPill>
          </div>
        </section>

        {loading ? (
          <StateBox title="Konuşmalar yükleniyor" description="Sohbet kayıtları hazırlanıyor." />
        ) : error ? (
          <StateBox tone="error" title="Konuşmalar alınamadı" description={error} />
        ) : filteredConversations.length === 0 ? (
          <StateBox
            title="Sonuç bulunamadı"
            description="Filtreyi veya arama kelimesini değiştirerek tekrar deneyin."
          />
        ) : (
          <section className="grid gap-4">
            {filteredConversations.map((conversation) => {
              const hasUnread =
                typeof conversation.unreadCount === "number" && conversation.unreadCount > 0;

              const presence = presenceMap[conversation.id] || {
                client: false,
                expert: false,
              };

              const clientToken = getClientToken(conversation);
              const expertToken = getExpertToken(conversation);
              const clientUrl = buildChatUrl("client", conversation.id, clientToken);
              const expertUrl = buildChatUrl("expert", conversation.id, expertToken);

              const hasClientLink = Boolean(clientToken);
              const hasExpertLink = Boolean(expertToken);

              return (
                <article
                  key={conversation.id}
                  className={`rounded-[2rem] border bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    hasUnread ? "border-rose-200 ring-2 ring-rose-50" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill className={getStatusClass(conversation.status)}>
                          {getStatusText(conversation.status)}
                        </StatusPill>
                        <StatusPill className={getPaymentClass(conversation.payment_status)}>
                          {getPaymentText(conversation.payment_status)}
                        </StatusPill>
                        <StatusPill className={getSenderBadgeClass(conversation.last_message_sender)}>
                          Son: {getSenderText(conversation.last_message_sender)}
                        </StatusPill>

                        {hasUnread ? (
                          <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white shadow-sm">
                            {conversation.unreadCount} okunmamış
                          </span>
                        ) : (
                          <StatusPill className="bg-slate-100 text-slate-600 ring-slate-200">
                            Okundu
                          </StatusPill>
                        )}

                        <PresencePill label="Danışan" online={presence.client} />
                        <PresencePill label="Uzman" online={presence.expert} />

                        <StatusPill
                          className={
                            hasClientLink && hasExpertLink
                              ? "bg-sky-50 text-sky-700 ring-sky-100"
                              : "bg-amber-50 text-amber-700 ring-amber-100"
                          }
                        >
                          {hasClientLink && hasExpertLink
                            ? "Güvenli bağlantı hazır"
                            : "Güvenli bağlantı eksik"}
                        </StatusPill>
                      </div>

                      <p className="mt-4 break-all text-sm font-black text-slate-950">
                        {conversation.id}
                      </p>

                      <div className="mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <StatusPill className={getSenderBadgeClass(conversation.last_message_sender)}>
                            {getSenderText(conversation.last_message_sender)}
                          </StatusPill>
                          <span className="text-xs font-bold text-slate-500">
                            {formatDate(conversation.last_message_at || conversation.updated_at)}
                          </span>
                        </div>

                        <p
                          className={`text-sm font-semibold leading-6 ${
                            conversation.last_message ? "text-slate-900" : "text-slate-500"
                          }`}
                        >
                          {getPreviewText(conversation.last_message)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                        <span>Oluşturuldu: {formatDate(conversation.created_at)}</span>
                        <span>
                          Son aktivite:{" "}
                          {formatDate(conversation.last_message_at || conversation.updated_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-2 lg:w-56">
                      <Link
                        href={`/admin/conversations/${conversation.id}`}
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800"
                      >
                        Konuşmayı Aç →
                      </Link>

                      <a
                        href={hasClientLink ? clientUrl : undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!hasClientLink}
                        onClick={(event) => {
                          if (!hasClientLink) event.preventDefault();
                        }}
                        className={`rounded-2xl px-5 py-3 text-center text-xs font-black transition ${
                          hasClientLink
                            ? "bg-sky-600 text-white hover:bg-sky-700"
                            : "cursor-not-allowed bg-sky-100 text-sky-400"
                        }`}
                      >
                        Danışan Test Linki
                      </a>

                      <a
                        href={hasExpertLink ? expertUrl : undefined}
                        target="_blank"
                        rel="noreferrer"
                        aria-disabled={!hasExpertLink}
                        onClick={(event) => {
                          if (!hasExpertLink) event.preventDefault();
                        }}
                        className={`rounded-2xl px-5 py-3 text-center text-xs font-black transition ${
                          hasExpertLink
                            ? "bg-violet-600 text-white hover:bg-violet-700"
                            : "cursor-not-allowed bg-violet-100 text-violet-400"
                        }`}
                      >
                        Uzman Test Linki
                      </a>

                      {(!hasClientLink || !hasExpertLink) ? (
                        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700 ring-1 ring-amber-100">
                          API güvenli bağlantı alanlarını döndürmüyor olabilir.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
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
      <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </article>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${className}`}>
      {children}
    </span>
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
