'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', {
      method: 'POST',
    })

    router.push('/admin/login')
  }

  const navItems = [
    {
      href: '/admin/uzman-basvurulari',
      label: 'Uzman Başvuruları',
    },
    {
      href: '/admin/danisan-basvurulari',
      label: 'Danışan Başvuruları',
    },
    {
      href: '/admin/payments',
      label: 'Ödemeler',
    },
  ]

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 16,
          alignItems: 'center',
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div
            style={{
              letterSpacing: 8,
              fontSize: 14,
              fontWeight: 700,
              color: '#8a6a4f',
              marginBottom: 8,
            }}
          >
            MINDORA ADMIN
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>
            Admin Panel
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: '#fff',
              color: '#111',
              textDecoration: 'none',
              fontWeight: 800,
              border: '1px solid #ddd',
            }}
          >
            Siteye Dön
          </Link>

          <button
            onClick={logout}
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              background: '#000',
              color: '#fff',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '16px 20px',
                borderRadius: 16,
                textAlign: 'center',
                textDecoration: 'none',
                fontWeight: 900,
                background: isActive ? '#000' : '#fff',
                color: isActive ? '#fff' : '#111',
                border: '1px solid #ddd',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}