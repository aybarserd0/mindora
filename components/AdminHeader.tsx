"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createMindoraRealtimeClient } from "@/lib/supabase/realtime";

type Conversation = {
  id: string;
};

const primaryNavItems = [
  {
    href: "/admin",
    label: "Merkez",
  },
  {
    href: "/admin/uzman-basvurulari",
    label: "Uzmanlar",
  },
  {
    href: "/admin/danisan-basvurulari",
    label: "Danışanlar",
  },
  {
    href: "/admin/payments",
    label: "Ödemeler",
  },
  {
    href: "/admin/conversations",
    label: "Sohbetler",
  },
];

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [totalUnread, setTotalUnread] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(false);

  const isMountedRef = useRef(true);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createMindoraRealtimeClient>["channel"]
  > | null>(null);

  const loadTotalUnread = useCallback(async () => {
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
  }, []);

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
    const supabase = createMindoraRealtimeClient();

    const channel = supabase
      .channel("admin-header-unread-sync")
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
  }, [loadTotalUnread]);

  return (
    <header className="mb-5 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 shadow-sm md:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Link href="/admin" className="group min-w-fit no-underline">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
              Mindora Admin
            </p>
            <p className="mt-1 text-lg font-black leading-none text-slate-950">
              Yönetim
            </p>
          </Link>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {primaryNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

              const isConversation = item.href === "/admin/conversations";
              const hasUnread = isConversation && totalUnread > 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex min-w-fit items-center justify-center rounded-2xl px-4 py-2 text-sm font-black no-underline ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${
                    isActive
                      ? "bg-slate-950 text-white ring-slate-950"
                      : "bg-slate-50 text-slate-700 ring-slate-200 hover:bg-white"
                  }`}
                >
                  {item.label}

                  {hasUnread ? (
                    <span className="ml-2 rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-black text-white">
                      {totalUnread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between xl:justify-end">
          <span
            className={`inline-flex items-center justify-center rounded-full px-3 py-2 text-xs font-black ring-1 ${
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
          </span>

          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 no-underline transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm"
            >
              Site
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-sm"
            >
              Çıkış
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
