-- Komisyon modeli, seans iptali ve iade takibi
--
-- * Standart komisyon %25; kurucu uzmanlara 12 ay boyunca %15.
--   Oran ödeme anında hesaplanıp payments.commission_rate alanına yazılır,
--   böylece sonradan yapılan oran değişiklikleri geçmiş ödemeleri etkilemez.
-- * Ödeme, karşılığı olan randevuya bağlanır (payments.booking_id).
-- * 24 saat kuralı: danışan seansa 24 saatten fazla kala iptal ederse tam
--   iade; daha geç iptalde iade yapılmaz ve ücret uzmana hakediş olarak kalır.
--   Uzman ya da Mindora iptal ederse her zaman tam iade.

begin;

-- 1) Uzman bazında komisyon
alter table public.experts
  add column if not exists founding_member boolean not null default false,
  add column if not exists founding_until timestamptz,
  add column if not exists commission_rate numeric(5, 4);

alter table public.experts
  drop constraint if exists experts_commission_rate_check;

alter table public.experts
  add constraint experts_commission_rate_check
  check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 0.5));

-- Şu an onaylı olan uzmanlar kurucu uzman sayılır (12 ay)
update public.experts
set founding_member = true,
    founding_until = now() + interval '12 months'
where status = 'approved'
  and founding_member = false;

-- 2) Ödemeler: uygulanan oran, bağlı randevu ve iade durumu
alter table public.payments
  add column if not exists commission_rate numeric(5, 4),
  add column if not exists booking_id uuid references public.session_bookings(id) on delete set null,
  add column if not exists refund_status text not null default 'none',
  add column if not exists refund_amount numeric(10, 2),
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refund_error text,
  add column if not exists iyzico_refund_id text;

alter table public.payments
  drop constraint if exists payments_refund_status_check;

alter table public.payments
  add constraint payments_refund_status_check
  check (refund_status in ('none', 'pending', 'refunded', 'failed'));

-- Mevcut ödemeler için oranı tutarlardan geri hesapla
update public.payments
set commission_rate = round(commission_amount / nullif(amount, 0), 4)
where commission_rate is null and amount > 0;

create unique index if not exists payments_booking_id_idx
  on public.payments (booking_id) where booking_id is not null;

create index if not exists payments_refund_status_idx
  on public.payments (refund_status) where refund_status in ('pending', 'failed');

-- 3) Randevu iptal bilgisi
alter table public.session_bookings
  add column if not exists cancelled_by text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists late_cancellation boolean not null default false;

alter table public.session_bookings
  drop constraint if exists session_bookings_cancelled_by_check;

alter table public.session_bookings
  add constraint session_bookings_cancelled_by_check
  check (cancelled_by is null or cancelled_by in ('client', 'expert', 'admin'));

commit;
