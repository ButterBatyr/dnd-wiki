-- ============================================================
--  Обновление v2: настройки сайта, чат, правки записей,
--  статусы-бейджи, оформление разделов, краткие описания.
--  Выполнить ЦЕЛИКОМ в Supabase → SQL Editor → Run.
--  Безопасно запускать повторно.
-- ============================================================

-- ---------- Новые поля ----------
alter table public.categories
  add column if not exists icon text,
  add column if not exists color text,
  add column if not exists description text,
  add column if not exists statuses jsonb not null default '[]'::jsonb;

alter table public.entries
  add column if not exists summary text not null default '',
  add column if not exists badge text,
  add column if not exists image_crop jsonb;

alter table public.requests
  add column if not exists kind text not null default 'new' check (kind in ('new', 'edit')),
  add column if not exists proposed_title text,
  add column if not exists proposed_body text;

-- Игрок может отправить заявку на новый предмет ИЛИ правку уже открытой записи
drop policy if exists "requests: insert own" on public.requests;
create policy "requests: insert own" on public.requests
  for insert to authenticated
  with check (
    player_id = auth.uid() and status = 'new' and (
      (kind = 'new' and entry_id is null)
      or (kind = 'edit' and entry_id is not null and exists (
        select 1 from public.entries e where e.id = requests.entry_id and e.status = 'released'
      ))
    )
  );

-- ---------- Имя игрока ----------
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
  values (
    new.id, new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    new_role
  );
  return new;
end;
$$;

-- Игрок может менять своё имя, но не роль и не почту
create or replace function public.profiles_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_dm() then
    new.role := old.role;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg
  before update on public.profiles
  for each row execute function public.profiles_guard();

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Настройки сайта ----------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;
alter table public.site_settings enable row level security;

drop policy if exists "settings: read" on public.site_settings;
create policy "settings: read" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "settings: dm write" on public.site_settings;
create policy "settings: dm write" on public.site_settings
  for all to authenticated using (public.is_dm()) with check (public.is_dm());

create or replace function public.chat_open()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select (data->>'chatOpen')::boolean from public.site_settings where id = 1), false);
$$;

-- ---------- Чат ----------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  author_name text not null default '',
  is_dm boolean not null default false,
  body text not null default '' check (char_length(body) <= 2000),
  image_path text,
  created_at timestamptz not null default now(),
  check (char_length(body) > 0 or image_path is not null)
);
create index if not exists messages_created_idx on public.messages (created_at desc);

create or replace function public.messages_fill()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  select * into p from public.profiles where id = new.user_id;
  new.author_name := coalesce(nullif(p.display_name, ''), 'Игрок');
  new.is_dm := (p.role = 'dm');
  return new;
end;
$$;

drop trigger if exists messages_fill_trg on public.messages;
create trigger messages_fill_trg
  before insert on public.messages
  for each row execute function public.messages_fill();

alter table public.messages enable row level security;

drop policy if exists "messages: read" on public.messages;
create policy "messages: read" on public.messages
  for select to authenticated using (true);
drop policy if exists "messages: insert" on public.messages;
create policy "messages: insert" on public.messages
  for insert to authenticated
  with check (user_id = auth.uid() and (public.is_dm() or public.chat_open()));
drop policy if exists "messages: delete" on public.messages;
create policy "messages: delete" on public.messages
  for delete to authenticated using (public.is_dm() or user_id = auth.uid());

-- Картинки чата
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', false)
on conflict (id) do nothing;

drop policy if exists "chat images: read" on storage.objects;
create policy "chat images: read" on storage.objects
  for select to authenticated using (bucket_id = 'chat-images');
drop policy if exists "chat images: insert" on storage.objects;
create policy "chat images: insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-images' and (public.is_dm() or public.chat_open()));
drop policy if exists "chat images: dm delete" on storage.objects;
create policy "chat images: dm delete" on storage.objects
  for delete to authenticated using (bucket_id = 'chat-images' and public.is_dm());

-- Живые обновления (чат и настройки приходят без перезагрузки страницы)
do $$
begin
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.site_settings; exception when duplicate_object then null; end;
end $$;
