"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createMindoraRealtimeClient } from "@/lib/supabase/realtime";
import NotificationBell from "@/components/NotificationBell";

type Conversation = {
  id: string;
};

const menuGroups = [
  {
    title: "Genel",
    items: [
      { href: "/admin", label: "Gösterge Paneli" },
    ],
  },
  {
    title: "Operasyon",
    items: [
      { href: "/admin/uzman-basvurulari", label: "Uzman Başvuruları" },
      { href: "/admin/danisan-basvurulari", label: "Danışan Başvuruları" },
      { href: "/admin/conversations", label: "Sohbetler" },
      { href: "/admin/reviews", label: "Yorumlar" },
      { href: "/admin/reports", label: "Raporlar" },
    ],
  },
  {
    title: "Finans",
    items: [
      { href: "/admin/payments", label: "Ödemeler" },
      { href: "/admin/payouts", label: "Uzman Ödemeleri" },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(false);

  const isMountedRef = useRef(true);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>["channel"]
  > | null>(null);

  const isLoginPage = pathname === "/admin/login";

  const loadTotalUnread = useCallback(async () => {
    if (isLoginPage) return;

    try {
      setLoadingUnread(true);

      const response = await fetch("/api/admin/conversations", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        if (isMountedRef.current) setTotalUnread(0);
        return;
      }

      const conversations: Conversation[] = Array.isArray(data.conversations)
        ? data.conversations
        : [];

      const unreadCounts = await Promise.all(
        conversations.map(async (conversation) => {
          try {
            const unreadResponse = await fetch(
              `/api/conversations/${conversation.id}/unread?userType=admin`,
              {
                cache: "no-store",
                headers: {
                  Accept: "application/json",
                },
              }
            );

            const unreadData = await unreadResponse.json().catch(() => null);
            return Number(unreadData?.unreadCount || 0);
          } catch {
            return 0;
          }
        })
      );

      const total = unreadCounts.reduce((sum, count) => sum + count, 0);

      if (isMountedRef.current) {
        setTotalUnread(total);
      }
    } catch {
      if (isMountedRef.current) {
        setTotalUnread(0);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingUnread(false);
      }
    }
  }, [isLoginPage]);

  async function logout() {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    router.push("/admin/login");
  }

  useEffect(() => {
    isMountedRef.current = true;
    void loadTotalUnread();

    return () => {
      isMountedRef.current = false;
    };
  }, [loadTotalUnread]);

  useEffect(() => {
    if (isLoginPage) return;

    const supabase = createMindoraRealtimeClient();

    const channel = supabase
      .channel("admin-shell-unread-sync")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          void loadTotalUnread();
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
          void loadTotalUnread();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = null;
    };
  }, [isLoginPage, loadTotalUnread]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  const sidebar = (
    <aside className="flex h-full flex-col bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <Link href="/admin" className="block no-underline">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
              Mindora Admin
            </p>
            <p className="mt-1 text-xl font-black leading-none text-slate-950">
              Yönetim
            </p>
          </Link>

          <NotificationBell role="admin" />
        </div>

        <div
          className={`mt-4 inline-flex rounded-full px-3 py-2 text-xs font-black ring-1 ${
            totalUnread > 0
              ? "bg-rose-50 text-rose-700 ring-rose-100"
              : "bg-emerald-50 text-emerald-700 ring-emerald-100"
          }`}
        >
          {loadingUnread
            ? "Mesajlar kontrol ediliyor"
            : totalUnread > 0
              ? `${totalUnread} okunmamış mesaj`
              : "Mesaj yok"}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                {group.title}
              </p>

              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const isConversation = item.href === "/admin/conversations";
                  const hasUnread = isConversation && totalUnread > 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-black no-underline transition ${
                        active
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <span>{item.label}</span>

                      {hasUnread ? (
                        <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                          {totalUnread}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-700 no-underline transition hover:bg-slate-50"
          >
            Site
          </Link>

          <button
            type="button"
            onClick={logout}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Çıkış
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72 lg:border-r lg:border-slate-200">
        {sidebar}
      </div>

      <div className="lg:pl-72">
        <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="no-underline">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Mindora Admin
              </p>
              <p className="text-lg font-black text-slate-950">Yönetim</p>
            </Link>

            <div className="flex items-center gap-2">
              <NotificationBell role="admin" />

              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
              >
                Menü
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden">
            <div className="h-full w-80 max-w-[86vw] border-r border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <p className="text-sm font-black text-slate-950">Yönetim Menüsü</p>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                >
                  Kapat
                </button>
              </div>

              {sidebar}
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
