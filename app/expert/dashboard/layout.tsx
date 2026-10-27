"use client";

import { professionLabel } from "@/lib/professions";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import NotificationBell from "@/components/NotificationBell";

type NavItem = {
  label: string;
  href: string;
  description: string;
  icon: string;
  badge?: string;
};

const navigationItems: NavItem[] = [
  {
    label: "Genel Bakış",
    href: "/expert/dashboard",
    description: "Panel özeti",
    icon: "⌂",
  },
  {
    label: "Danışanlar",
    href: "/expert/dashboard/clients",
    description: "Danışan süreçleri",
    icon: "◉",
  },
  {
    label: "Görüşmeler",
    href: "/expert/dashboard/sessions",
    description: "Seans takibi",
    icon: "▷",
  },
  {
    label: "Takvim",
    href: "/expert/dashboard/availability",
    description: "Müsait saatler",
    icon: "▦",
  },
  {
    label: "Kazançlar",
    href: "/expert/dashboard/earnings",
    description: "Ödeme özeti",
    icon: "₺",
  },
  {
    label: "Yorumlar",
    href: "/expert/dashboard/reviews",
    description: "Değerlendirmeler",
    icon: "☆",
  },
  {
    label: "Süpervizyon",
    href: "/expert/dashboard/supervizyon",
    description: "Süpervizör bul, vakalar, saat defteri",
    icon: "◇",
    badge: "Yeni",
  },
  {
    label: "Süpervizör alanı",
    href: "/expert/dashboard/supervizor",
    description: "Süpervizyon verdiğin psikologlar",
    icon: "◆",
  },
  {
    label: "Doğrulama",
    href: "/expert/dashboard/verification",
    description: "Belge ve güven süreci",
    icon: "✓",
  },
  {
    label: "Profil",
    href: "/expert/dashboard/profile",
    description: "Profil bilgileri",
    icon: "○",
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/expert/dashboard") return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

function useExpertSession() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized">("loading");
  const [expertName, setExpertName] = useState("");
  const [profession, setProfession] = useState("psychologist");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/expert/session", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setStatus("unauthorized");
          router.replace("/expert/login");
          return;
        }

        setExpertName(data.name || "");
        setProfession(data.profession || "psychologist");
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("unauthorized");
          router.replace("/expert/login");
        }
      }
    }

    void check();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return { status, expertName, profession };
}

export default function ExpertDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/expert/dashboard";
  const { status, expertName, profession } = useExpertSession();
  // Süpervizyon menüleri yalnızca psikologlar için
  const navItems = profession === "psychologist"
    ? navigationItems
    : navigationItems.filter((item) => !item.href.startsWith("/expert/dashboard/supervizyon") && !item.href.startsWith("/expert/dashboard/supervizor"));

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-semibold text-slate-600">Oturum doğrulanıyor...</p>
      </div>
    );
  }

  if (status === "unauthorized") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-semibold text-slate-600">Giriş sayfasına yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex h-full min-w-0">
        <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="px-5 pb-4 pt-6">
            <Link href="/expert/dashboard" className="flex items-center gap-2.5 no-underline">
              <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
              <span className="leading-tight">
                <span className="block font-display text-lg font-semibold text-slate-900">mindora</span>
                <span className="block text-xs text-slate-500">{professionLabel(profession)} · çalışma alanın</span>
              </span>
            </Link>
          </div>

          <nav aria-label="Uzman menüsü" className="flex-1 overflow-y-auto px-3 pb-6 pt-2">
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-[0.94rem] no-underline transition-colors ${
                      active
                        ? "bg-pine-50 font-semibold text-pine-900 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-pine-600"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="rounded-full bg-lilac-100 px-2 py-0.5 text-[11px] font-semibold text-lilac-800">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-200 p-4">
            <p className="truncate text-sm font-semibold text-slate-900">
              {expertName || "Uzman hesabı"}
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href="/expert/dashboard/profile"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 no-underline transition-colors hover:border-slate-300"
              >
                Profil
              </Link>
              <button
                type="button"
                onClick={() => {
                  void fetch("/api/expert/session", { method: "DELETE" }).finally(() => {
                    window.location.href = "/expert/login";
                  });
                }}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
              >
                Çıkış
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-20 border-b border-slate-200 bg-white lg:bg-slate-50">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <Link href="/expert/dashboard" className="flex items-center gap-2 no-underline lg:hidden">
                <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-cover" />
                <span className="font-display text-lg font-semibold text-slate-900">Çalışma alanın</span>
              </Link>
              <p className="hidden text-sm text-slate-500 lg:block">
                {expertName ? `Hoş geldin, ${expertName.split(" ")[0]}` : "Hoş geldin"}
                <span className="ml-2 rounded-full bg-lilac-50 px-2.5 py-0.5 text-xs font-semibold text-lilac-800">{professionLabel(profession)}</span>
              </p>
              <NotificationBell role="expert" />
            </div>

            <nav aria-label="Uzman menüsü" className="flex gap-2 overflow-x-auto px-4 pb-3 sm:px-6 lg:hidden">
              {navItems.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium no-underline transition-colors ${
                      active
                        ? "bg-pine-800 text-white"
                        : "border border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto bg-slate-50">{children}</main>
        </div>
      </div>
    </div>
  );
}
