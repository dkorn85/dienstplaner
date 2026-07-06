-- Referenzkopie der Migration "dienstplaner_init"
-- (angewendet auf Supabase-Projekt gpchwlqeqejxvynewjns, geteilte DB → dp_-Namespace)

create table public.dp_orte (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name          text not null,
  kurz          text not null,
  farbe         text not null default '#f0b429',
  von_default   time,
  bis_default   time,
  pause_default int  not null default 0 check (pause_default >= 0),
  aktiv         boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (user_id, name)
);

create table public.dp_dienste (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  datum           date not null,          -- Tag, an dem der Dienst BEGINNT
  von             time not null,
  bis             time not null,          -- bis <= von bedeutet: geht über Mitternacht
  pause           int  not null default 0 check (pause >= 0),
  ort_id          uuid not null references public.dp_orte(id) on delete restrict,
  zusammenfassung text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (von <> bis)
);
create index dp_dienste_user_datum_idx on public.dp_dienste (user_id, datum);

create table public.dp_settings (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name         text not null default 'Dennis Korn',
  email        text not null default 'dkorn85@gmail.com',
  soll_default numeric(6,2) not null default 160 check (soll_default >= 0),
  signatur     text,                       -- PNG-Data-URL der gespeicherten Unterschrift
  updated_at   timestamptz not null default now()
);

create table public.dp_monatssoll (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  monat   date not null check (monat = date_trunc('month', monat)::date),
  soll    numeric(6,2) not null check (soll >= 0),
  primary key (user_id, monat)
);

alter table public.dp_orte       enable row level security;
alter table public.dp_dienste    enable row level security;
alter table public.dp_settings   enable row level security;
alter table public.dp_monatssoll enable row level security;

create policy dp_orte_own       on public.dp_orte       for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy dp_dienste_own    on public.dp_dienste    for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy dp_settings_own   on public.dp_settings   for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy dp_monatssoll_own on public.dp_monatssoll for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
