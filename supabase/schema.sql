-- ============================================================
--  D&D Wiki: схема, RLS и Storage. Выполнить целиком в
--  Supabase → SQL Editor ДО регистрации первого пользователя.
-- ============================================================

-- ---------- Таблицы ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'player' check (role in ('dm', 'player')),
  created_at timestamptz not null default now()
);

-- Email-ы, которые автоматически становятся DM при регистрации (необязательно)
create table public.dm_emails (email text primary key);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.categories(id) on delete cascade,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  image_path text,
  category_id uuid references public.categories(id) on delete restrict,
  tags text[] not null default '{}',
  status text not null default 'unreleased' check (status in ('released', 'unreleased')),
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  released_at timestamptz
);

-- «Секрет DM» лежит в ОТДЕЛЬНОЙ таблице: игрок физически не может её прочитать
create table public.entry_secrets (
  entry_id uuid primary key references public.entries(id) on delete cascade,
  body text not null default ''
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 200),
  comment text check (comment is null or char_length(comment) <= 1000),
  status text not null default 'new' check (status in ('new', 'approved', 'rejected')),
  entry_id uuid references public.entries(id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.entries (status, released_at desc);
create index on public.entries (category_id);
create index on public.entries using gin (tags);
create index on public.requests (player_id);
create index on public.categories (parent_id, position);

-- ---------- Функции ----------
create or replace function public.is_dm()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'dm');
$$;

-- Новый пользователь: первый (или из dm_emails) становится DM
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  new_role text := 'player';
begin
  perform pg_advisory_xact_lock(7001);
  if not exists (select 1 from public.profiles)
     or exists (select 1 from public.dm_emails where lower(email) = lower(new.email)) then
    new_role := 'dm';
  end if;
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, split_part(new.email, '@', 1), new_role);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Нельзя снять роль с последнего DM
create or replace function public.keep_one_dm()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if old.role = 'dm' and new.role <> 'dm'
     and not exists (select 1 from public.profiles where role = 'dm' and id <> old.id) then
    raise exception 'Нельзя убрать последнего DM';
  end if;
  return new;
end;
$$;

create trigger profiles_keep_one_dm
  before update on public.profiles
  for each row execute function public.keep_one_dm();

create or replace function public.entries_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.status = 'released' and (tg_op = 'INSERT' or old.status is distinct from 'released') then
    new.released_at := now();
  end if;
  if new.status = 'unreleased' then
    new.released_at := null;
  end if;
  return new;
end;
$$;

create trigger entries_touch_trg
  before insert or update on public.entries
  for each row execute function public.entries_touch();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.dm_emails enable row level security;
alter table public.categories enable row level security;
alter table public.entries enable row level security;
alter table public.entry_secrets enable row level security;
alter table public.requests enable row level security;

-- profiles: свой профиль видит каждый, все профили и смену ролей — только DM
create policy "profiles: read own or dm" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_dm());
create policy "profiles: dm update" on public.profiles
  for update to authenticated using (public.is_dm()) with check (public.is_dm());

create policy "dm_emails: dm only" on public.dm_emails
  for all to authenticated using (public.is_dm()) with check (public.is_dm());

-- categories: читают все вошедшие, меняет только DM
create policy "categories: read" on public.categories
  for select to authenticated using (true);
create policy "categories: dm write" on public.categories
  for all to authenticated using (public.is_dm()) with check (public.is_dm());

-- entries: игрок видит только released, DM — всё
create policy "entries: read released or dm" on public.entries
  for select to authenticated using (status = 'released' or public.is_dm());
create policy "entries: dm write" on public.entries
  for all to authenticated using (public.is_dm()) with check (public.is_dm());

-- секреты: только DM
create policy "secrets: dm only" on public.entry_secrets
  for all to authenticated using (public.is_dm()) with check (public.is_dm());

-- requests: игрок создаёт и видит свои, DM управляет всеми
create policy "requests: insert own" on public.requests
  for insert to authenticated
  with check (player_id = auth.uid() and status = 'new' and entry_id is null);
create policy "requests: read own or dm" on public.requests
  for select to authenticated using (player_id = auth.uid() or public.is_dm());
create policy "requests: delete own new" on public.requests
  for delete to authenticated using (player_id = auth.uid() and status = 'new');
create policy "requests: dm update" on public.requests
  for update to authenticated using (public.is_dm()) with check (public.is_dm());
create policy "requests: dm delete" on public.requests
  for delete to authenticated using (public.is_dm());

-- ---------- Storage ----------
-- Приватный бакет: файл отдаётся только если запись released (или читает DM)
insert into storage.buckets (id, name, public)
values ('entry-images', 'entry-images', false)
on conflict (id) do nothing;

create policy "images: read released or dm" on storage.objects
  for select to authenticated using (
    bucket_id = 'entry-images' and (
      public.is_dm() or exists (
        select 1 from public.entries e
        where e.image_path = storage.objects.name and e.status = 'released'
      )
    )
  );
create policy "images: dm insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'entry-images' and public.is_dm());
create policy "images: dm update" on storage.objects
  for update to authenticated using (bucket_id = 'entry-images' and public.is_dm());
create policy "images: dm delete" on storage.objects
  for delete to authenticated using (bucket_id = 'entry-images' and public.is_dm());

-- ---------- Начальные разделы ----------
insert into public.categories (name, position) values
  ('Предметы', 1),
  ('Магические предметы', 2),
  ('Лорные предметы', 3),
  ('Фракции', 4),
  ('Государства', 5),
  ('Персонажи', 6),
  ('Второстепенные персонажи', 7),
  ('Отряд', 8),
  ('События', 9);
