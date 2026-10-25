-- Danışanın kendi randevusunu alıp her seans için ayrı ödeme yapması
--
-- "pending_payment": danışan saati seçti, ödeme sayfasına yönlendirildi.
-- Saat bu sürede başkasına verilmez; ödeme 20 dakika içinde tamamlanmazsa
-- randevu otomatik iptal edilir (lib/scheduling/holds.ts).

begin;

alter table public.session_bookings
  drop constraint if exists session_bookings_status_check;

alter table public.session_bookings
  add constraint session_bookings_status_check
  check (status in ('pending_payment', 'scheduled', 'confirmed', 'active', 'completed', 'cancelled', 'no_show', 'rescheduled'));

create index if not exists session_bookings_pending_payment_idx
  on public.session_bookings (created_at)
  where status = 'pending_payment';

commit;
