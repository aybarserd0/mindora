-- Mindora üç hizmet veriyor: psikolog, diyetisyen, kişisel antrenör.
-- Mevcut tüm kayıtlar psikolog olarak kalır.

alter table public.experts
  add column if not exists profession text not null default 'psychologist';

alter table public.experts
  drop constraint if exists experts_profession_check;
alter table public.experts
  add constraint experts_profession_check
  check (profession in ('psychologist', 'dietitian', 'trainer'));

create index if not exists experts_profession_status_idx
  on public.experts (profession, status);

alter table public.client_applications
  add column if not exists profession text not null default 'psychologist';

alter table public.client_applications
  drop constraint if exists client_applications_profession_check;
alter table public.client_applications
  add constraint client_applications_profession_check
  check (profession in ('psychologist', 'dietitian', 'trainer'));

-- Diyetisyen / antrenör başvurularındaki sağlık ön sorusu: yalnızca Evet / Hayır / Emin değilim.
-- Ayrıntı formda istenmez, ilk görüşmede uzmanla konuşulur.
alter table public.client_applications
  add column if not exists health_screen text;

-- Antrenör başvurularında antrenmanın nerede yapılacağı: Salonda / Evde / İkisi de
alter table public.client_applications
  add column if not exists setting text;

create index if not exists client_applications_profession_idx
  on public.client_applications (profession, created_at desc);
