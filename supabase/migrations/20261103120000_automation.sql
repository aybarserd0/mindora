-- Otomasyon: otomatik eşleşme, haftalık uzman hakedişi, takip e-postaları,
-- uzman belge hatırlatmaları. Tekrar çalıştırılabilir, tek işlem.

begin;

-- Uzman cinsiyeti: yalnızca danışanın "Kadın / Erkek uzman" tercihine uymak için.
alter table public.experts
  add column if not exists gender text;
alter table public.experts
  drop constraint if exists experts_gender_check;
alter table public.experts
  add constraint experts_gender_check
  check (gender is null or gender in ('kadin', 'erkek'));

-- Uzmana giden hatırlatmalar (takvim/ücret eksik, belge eksik)
alter table public.experts
  add column if not exists setup_reminder_sent_at timestamptz,
  add column if not exists docs_reminder_sent_at timestamptz,
  add column if not exists docs_reminder_count integer not null default 0;

-- Eşleşmenin kaynağı ve takip e-postaları
alter table public.client_applications
  add column if not exists matched_at timestamptz,
  add column if not exists match_source text,
  add column if not exists auto_match_attempted_at timestamptz,
  add column if not exists unpaid_reminder_sent_at timestamptz,
  add column if not exists waiting_notice_sent_at timestamptz;
alter table public.client_applications
  drop constraint if exists client_applications_match_source_check;
alter table public.client_applications
  add constraint client_applications_match_source_check
  check (match_source is null or match_source in ('auto', 'admin'));

-- Bir süredir seans almayan danışana "yeniden başla" e-postası
alter table public.conversations
  add column if not exists reengage_sent_at timestamptz;

-- Haftalık hakediş: her ödeme en fazla bir hakediş kaydına bağlanır
alter table public.payments
  add column if not exists payout_id uuid references public.expert_payouts(id) on delete set null;
create index if not exists payments_payout_id_idx on public.payments (payout_id);

-- Hakediş kaydının hangi haftaya ait olduğu; aynı hafta iki kez oluşturulmaz
alter table public.expert_payouts
  add column if not exists period_key text;
create unique index if not exists expert_payouts_expert_period_idx
  on public.expert_payouts (expert_id, period_key)
  where period_key is not null;

create index if not exists client_applications_status_created_idx
  on public.client_applications (status, created_at);

commit;
