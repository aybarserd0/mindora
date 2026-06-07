import Link from "next/link";
import type { ReactNode } from "react";

const navigationItems = [
  {
    label: "Dashboard",
    href: "/expert/dashboard",
    description: "Genel özet",
  },
  {
    label: "Seanslar",
    href: "/expert/dashboard/sessions",
    description: "Yaklaşan ve geçmiş görüşmeler",
  },
  {
    label: "Danışanlar",
    href: "/expert/dashboard/clients",
    description: "Aktif danışan listesi",
  },
  {
    label: "Müsaitlik",
    href: "/expert/availability",
    description: "Uygun gün ve saatler",
  },
  {
    label: "Kazançlar",
    href: "/expert/dashboard/earnings",
    description: "Gelir ve ödeme özeti",
  },
  {
    label: "Profil",
    href: "/expert/dashboard/profile",
    description: "Uzman profil bilgileri",
  },
];

export default function ExpertDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col px-4 py-5 sm:px-6 lg:px-5">
            <div className="flex items-center justify-between gap-4 lg:block">
              <Link href="/" className="group inline-flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white shadow-sm transition group-hover:bg-indigo-700">
                  M
                </span>
                <span>
                  <span className="block text-base font-bold tracking-tight text-slate-950">
                    Mindora
                  </span>
                  <span className="block text-xs font-medium text-slate-500">
                    Uzman Paneli
                  </span>
                </span>
              </Link>

              <Link
                href="/"
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 lg:hidden"
              >
                Siteye Dön
              </Link>
            </div>

            <nav className="mt-6 grid gap-2 sm:grid-cols-2 lg:flex lg:flex-1 lg:flex-col lg:gap-1">
              {navigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50 lg:border-transparent"
                >
                  <span className="block text-sm font-semibold text-slate-950">
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    {item.description}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="mt-6 hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:block">
              <p className="text-sm font-semibold text-slate-950">Panel durumu</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                C8 Expert Dashboard aktif. Seanslar, danışanlar ve kazanç
                modülleri bu yapı üzerinden genişletilecek.
              </p>
            </div>

            <div className="mt-4 hidden lg:block">
              <Link
                href="/"
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Ana Siteye Dön
              </Link>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                  Expert Workspace
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  Uzman Yönetim Alanı
                </h2>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-indigo-100" />
                <div>
                  <p className="text-sm font-semibold text-slate-950">Uzman</p>
                  <p className="text-xs text-slate-500">Aktif oturum</p>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
