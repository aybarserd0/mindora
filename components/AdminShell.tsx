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
    title: "Süpervizyon",
    items: [
      { href: "/admin/supervizorler", label: "Süpervizörler" },
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
    <aside className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="flex items-center gap-2.5 no-underline">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold text-white">mindora</span>
              <span className="block text-xs text-slate-400">Yönetim</span>
            </span>
          </Link>

          <NotificationBell role="admin" />
        </div>

        <Link
          href="/admin/conversations"
          className={`mt-5 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm no-underline transition-colors ${
            totalUnread > 0
              ? "bg-rose-500/15 text-rose-100 hover:bg-rose-500/25"
              : "bg-white/5 text-slate-400 hover:bg-white/10"
          }`}
        >
          <span>
            {loadingUnread
              ? "Mesajlar kontrol ediliyor"
              : totalUnread > 0
                ? "Okunmamış mesaj"
                : "Okunmamış mesaj yok"}
          </span>
          {totalUnread > 0 ? (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
              {totalUnread}
            </span>
          ) : null}
        </Link>
      </div>

      <nav aria-label="Yönetim menüsü" className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="space-y-6">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-xs font-medium text-slate-500">{group.title}</p>

              <div className="mt-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const active = isActivePath(pathname, item.href);
                  const isConversation = item.href === "/admin/conversations";
                  const hasUnread = isConversation && totalUnread > 0;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center justify-between rounded-lg px-3 py-2.5 text-[0.94rem] no-underline transition-colors ${
                        active
                          ? "bg-white/10 font-semibold text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-pine-300"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span>{item.label}</span>

                      {hasUnread ? (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
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

      <div className="border-t border-white/10 p-3">
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-2.5 text-center text-sm font-medium text-slate-300 no-underline transition-colors hover:bg-white/5 hover:text-white"
          >
            Siteye git
          </Link>

          <button
            type="button"
            onClick={logout}
            className="rounded-lg bg-white/10 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-64">
        {sidebar}
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/admin" className="flex items-center gap-2 no-underline">
              <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
              <span className="font-display text-lg font-semibold text-slate-900">Yönetim</span>
            </Link>

            <div className="flex items-center gap-2">
              <NotificationBell role="admin" />

              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                aria-expanded={mobileMenuOpen}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800"
              >
                Menü
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div
            className="fixed inset-0 z-50 bg-slate-950/50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="h-full w-72 max-w-[86vw] shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              {sidebar}
            </div>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
