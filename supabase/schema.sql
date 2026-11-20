-- =====================================================================
--  Sorteo TechnoCell · esquema de base de datos (Supabase / Postgres)
--  Cómo usarlo: Supabase → SQL Editor → pega todo este archivo → Run.
--  Es idempotente: puedes volver a ejecutarlo sin perder datos.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tiendas ----------
create table if not exists stores (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  city        text,
  -- Token secreto que va dentro del QR. Sin él no se puede registrar en esa tienda,
  -- así nadie se suma puntos de una tienda solo cambiando la URL.
  qr_token    text not null unique default encode(extensions.gen_random_bytes(9), 'hex'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- Participantes (uno por cédula) ----------
create table if not exists participants (
  id          uuid primary key default gen_random_uuid(),
  cedula      text not null unique check (cedula ~ '^[0-9]{6,9}$'),
  full_name   text not null check (char_length(full_name) between 3 and 80),
  phone       text not null check (phone ~ '^[0-9]{10,13}$'),
  instagram   text,
  accepted_rules_at timestamptz not null default now(),
  disqualified boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- Registros en tienda (check-ins) ----------
do $$ begin
  create type review_status as enum ('aprobado', 'pendiente', 'rechazado');
exception when duplicate_object then null; end $$;

create table if not exists checkins (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  store_id       uuid not null references stores(id) on delete restrict,
  day            date not null,                 -- día local de la tienda (RAFFLE_TZ)
  photo_path     text not null,                 -- ruta en el bucket privado "fotos"
  status         review_status not null default 'aprobado',
  user_agent     text,
  created_at     timestamptz not null default now(),
  unique (participant_id, store_id, day)        -- 1 registro por tienda al día (lo impone la BD)
);
-- Miniatura (~600 px) para la galería pública (en videos: un cuadro del video)
alter table checkins add column if not exists thumb_path text;
-- Foto (+2) o video (+4)
alter table checkins add column if not exists media_type text not null default 'foto';
do $$ begin
  alter table checkins add constraint checkins_media_type_chk check (media_type in ('foto', 'video'));
exception when duplicate_object then null; end $$;
create index if not exists checkins_participant_idx on checkins (participant_id);
create index if not exists checkins_created_idx on checkins (created_at desc);
create index if not exists checkins_store_idx on checkins (store_id);

-- ---------- Publicaciones en Instagram (bonus) ----------
create table if not exists social_claims (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references participants(id) on delete cascade,
  checkin_id     uuid not null unique references checkins(id) on delete cascade, -- 1 bonus por foto
  post_url       text not null check (post_url ~* '^https://(www\.)?instagram\.com/'),
  status         review_status not null default 'pendiente', -- lo valida el equipo
  created_at     timestamptz not null default now()
);

-- Un mismo enlace de Instagram no puede usarse dos veces
create unique index if not exists social_claims_post_url_key on social_claims (lower(post_url));
create index if not exists social_claims_participant_idx on social_claims (participant_id);

-- ---------- Historial de sorteos ----------
create table if not exists draws (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid not null references participants(id),
  winner_points   int not null,
  total_points    int not null,
  total_participants int not null,
  note            text,
  created_at      timestamptz not null default now()
);
-- Verificación del ganador: se revisan sus fotos/videos antes de entregar el premio
alter table draws add column if not exists status text not null default 'por_verificar';
create index if not exists draws_participant_idx on draws (participant_id);

-- ---------- Ajustes editables desde el panel (fecha de cierre, etc.) ----------
create table if not exists settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- ---------- Intentos fallidos de cédula + teléfono (frena a quien intente adivinar) ----------
create table if not exists failed_attempts (
  id         bigserial primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);
create index if not exists failed_attempts_ip_idx on failed_attempts (ip, created_at desc);

-- ---------- Reglas de puntos (en un solo lugar) ----------
--  2 puntos por cada foto aprobada, 4 por cada video aprobado
--  +10 si tiene registros aprobados en TODAS las tiendas activas
--  +2 por cada publicación de Instagram aprobada
create or replace view participant_points with (security_invoker = on) as
with active_stores as (
  select count(*)::int as n from stores where active
),
c as (
  select participant_id,
         count(*)::int                    as checkins,
         count(distinct store_id)::int    as stores_visited,
         count(*) filter (where ch.media_type = 'video')::int as videos,
         sum(case when ch.media_type = 'video' then 4 else 2 end)::int as media_points
  from checkins ch
  join stores s on s.id = ch.store_id and s.active
  where ch.status = 'aprobado'
  group by participant_id
),
sc as (
  select participant_id, count(*)::int as posts
  from social_claims where status = 'aprobado'
  group by participant_id
)
select p.id,
       p.cedula,
       p.full_name,
       p.phone,
       p.instagram,
       p.disqualified,
       p.created_at,
       coalesce(c.checkins, 0)        as checkins,
       coalesce(c.stores_visited, 0)  as stores_visited,
       (select n from active_stores)  as stores_total,
       coalesce(sc.posts, 0)          as posts,
       ( coalesce(c.media_points, 0)
         + case when (select n from active_stores) > 0
                     and coalesce(c.stores_visited, 0) >= (select n from active_stores)
                then 10 else 0 end
         + 2 * coalesce(sc.posts, 0) )::int as points,
       coalesce(c.videos, 0)          as videos
from participants p
left join c  on c.participant_id  = p.id
left join sc on sc.participant_id = p.id;

-- ---------- Seguridad ----------
-- Toda la lectura/escritura pasa por el servidor de Next.js con la service role key.
-- Activamos RLS sin políticas: el navegador (anon key) no puede leer ni escribir nada.
alter table stores        enable row level security;
alter table participants  enable row level security;
alter table checkins      enable row level security;
alter table social_claims enable row level security;
alter table draws         enable row level security;
alter table settings      enable row level security;
alter table failed_attempts enable row level security;
-- El servidor (service_role) necesita permisos explícitos (los proyectos nuevos de Supabase no los dan solos).
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- Quitamos permisos a anon/authenticated: el navegador no toca la base, todo pasa por el servidor.
revoke all on stores, participants, checkins, social_claims, draws, settings, failed_attempts, participant_points from anon, authenticated;

-- ---------- Storage: bucket privado para las fotos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', false, 62914560,
        array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Tiendas iniciales (edita o borra a gusto) ----------
insert into stores (slug, name, city) values
  ('unicentro',  'CC Unicentro',         'Maracay'),
  ('aviadores',  'CC Los Aviadores',     'Maracay'),
  ('galeria',    'CC Galería Plaza',     'Maracay'),
  ('estacion',   'CC Estación Central',  'Maracay'),
  ('bazar',      'CC Gran Bazar',        'Maracay'),
  ('freemarket', 'CC Free Market',       'Valencia')
on conflict (slug) do nothing;
