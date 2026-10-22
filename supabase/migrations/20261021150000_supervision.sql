-- Süpervizyon modülü (MVP)
--
-- İlkeler:
-- * Süpervizyon verisi terapi tablolarından tamamen ayrıdır.
-- * Vaka kartları danışan tablolarına hiçbir yabancı anahtar taşımaz.
-- * Tüm tablolarda RLS açık ve policy yok: erişim yalnızca sunucudaki
--   service role üzerinden, uygulama katmanındaki yetki kontrolleriyle yapılır
--   (projenin geri kalanıyla aynı model).

begin;

-- 1) Uzman hesap türü: dışarıdan yalnızca süpervizyon için gelen psikologlar
alter table public.experts
  add column if not exists account_type text not null default 'therapist';

alter table public.experts
  drop constraint if exists experts_account_type_check;

alter table public.experts
  add constraint experts_account_type_check
  check (account_type in ('therapist', 'supervision_only'));

-- 2) Süpervizör profilleri
create table if not exists public.supervisor_profiles (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null unique references public.experts(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'paused')),
  approaches text[] not null default '{}',
  focus_areas text[] not null default '{}',
  bio text,
  years_experience integer check (years_experience is null or years_experience between 0 and 70),
  credentials text,
  session_price numeric(10, 2) check (session_price is null or session_price >= 0),
  commission_rate numeric(5, 4) not null default 0.1500
    check (commission_rate >= 0 and commission_rate <= 0.5),
  intro_call_enabled boolean not null default true,
  availability_note text,
  admin_note text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supervisor_profiles_status_idx
  on public.supervisor_profiles (status);

-- 3) Süpervizyon randevuları
create table if not exists public.supervision_bookings (
  id uuid primary key default gen_random_uuid(),
  supervisor_profile_id uuid not null references public.supervisor_profiles(id) on delete restrict,
  supervisee_expert_id uuid not null references public.experts(id) on delete restrict,
  kind text not null default 'individual' check (kind in ('intro', 'individual')),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'confirmed', 'completed', 'cancelled', 'no_show')),
  requested_start timestamptz not null,
  duration_minutes integer not null default 50 check (duration_minutes between 10 and 180),
  price numeric(10, 2) not null default 0,
  commission_rate numeric(5, 4) not null default 0,
  commission_amount numeric(10, 2) not null default 0,
  supervisor_amount numeric(10, 2) not null default 0,
  request_note text check (request_note is null or char_length(request_note) <= 1000),
  decline_reason text,
  iyzico_token text,
  iyzico_conversation_id text,
  iyzico_payment_id text,
  payment_page_url text,
  paid_at timestamptz,
  room_name text,
  completed_at timestamptz,
  cancelled_by text check (cancelled_by is null or cancelled_by in ('supervisor', 'supervisee', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supervision_bookings_supervisor_idx
  on public.supervision_bookings (supervisor_profile_id, requested_start desc);
create index if not exists supervision_bookings_supervisee_idx
  on public.supervision_bookings (supervisee_expert_id, requested_start desc);
create unique index if not exists supervision_bookings_iyzico_token_idx
  on public.supervision_bookings (iyzico_token) where iyzico_token is not null;

-- 4) Anonim vaka kartları (danışana bağlanan hiçbir alan yok)
create table if not exists public.supervision_cases (
  id uuid primary key default gen_random_uuid(),
  owner_expert_id uuid not null references public.experts(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  age_range text check (age_range is null or age_range in ('18-24', '25-34', '35-44', '45-54', '55+')),
  gender text check (gender is null or gender in ('kadin', 'erkek', 'diger', 'belirtilmedi')),
  topic text not null,
  session_count integer check (session_count is null or session_count between 0 and 1000),
  formulation text check (formulation is null or char_length(formulation) <= 4000),
  question text check (question is null or char_length(question) <= 1500),
  consent_attested boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'shared', 'closed')),
  closed_at timestamptz,
  delete_after timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supervision_cases_consent_required
    check (status = 'draft' or consent_attested)
);

create index if not exists supervision_cases_owner_idx
  on public.supervision_cases (owner_expert_id, updated_at desc);
create index if not exists supervision_cases_delete_after_idx
  on public.supervision_cases (delete_after) where delete_after is not null;

-- 5) Hangi vaka hangi seansta süpervizörle paylaşıldı
create table if not exists public.supervision_case_shares (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.supervision_cases(id) on delete cascade,
  booking_id uuid not null references public.supervision_bookings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (case_id, booking_id)
);

-- 6) Saat defteri
create table if not exists public.supervision_log_entries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.supervision_bookings(id) on delete restrict,
  supervisee_expert_id uuid not null references public.experts(id) on delete restrict,
  supervisor_profile_id uuid not null references public.supervisor_profiles(id) on delete restrict,
  session_date timestamptz not null,
  duration_minutes integer not null,
  format text not null default 'bireysel',
  approach text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'disputed')),
  confirmed_at timestamptz,
  verification_code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists supervision_log_entries_supervisee_idx
  on public.supervision_log_entries (supervisee_expert_id, session_date desc);

-- 7) Vaka kartı erişim logu (yalnızca ekleme)
create table if not exists public.supervision_access_log (
  id bigint generated always as identity primary key,
  actor_type text not null check (actor_type in ('supervisor', 'supervisee', 'admin')),
  actor_id uuid,
  case_id uuid,
  booking_id uuid,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);

-- updated_at tetikleyicisi
create or replace function public.supervision_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists supervisor_profiles_touch on public.supervisor_profiles;
create trigger supervisor_profiles_touch before update on public.supervisor_profiles
  for each row execute function public.supervision_touch_updated_at();

drop trigger if exists supervision_bookings_touch on public.supervision_bookings;
create trigger supervision_bookings_touch before update on public.supervision_bookings
  for each row execute function public.supervision_touch_updated_at();

drop trigger if exists supervision_cases_touch on public.supervision_cases;
create trigger supervision_cases_touch before update on public.supervision_cases
  for each row execute function public.supervision_touch_updated_at();

revoke execute on function public.supervision_touch_updated_at() from public, anon, authenticated;

-- RLS: açık, policy yok
alter table public.supervisor_profiles enable row level security;
alter table public.supervision_bookings enable row level security;
alter table public.supervision_cases enable row level security;
alter table public.supervision_case_shares enable row level security;
alter table public.supervision_log_entries enable row level security;
alter table public.supervision_access_log enable row level security;

commit;
