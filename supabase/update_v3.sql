-- ============================================================
--  Обновление v3: личные заметки, избранное, связанные записи.
--  Выполнить ЦЕЛИКОМ в НОВОЙ query (Supabase → SQL Editor → +).
--  Сначала должен быть выполнен update_v2.sql.
--  Безопасно запускать повторно.
-- ============================================================

-- ---------- Личные заметки (видит только автор, даже мастер чужие не читает) ----------
create table if not exists public.entry_notes (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 5000),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);
alter table public.entry_notes enable row level security;

drop policy if exists "notes: own read" on public.entry_notes;
create policy "notes: own read" on public.entry_notes
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "notes: own insert" on public.entry_notes;
create policy "notes: own insert" on public.entry_notes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = entry_notes.entry_id)
  );
drop policy if exists "notes: own update" on public.entry_notes;
create policy "notes: own update" on public.entry_notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "notes: own delete" on public.entry_notes;
create policy "notes: own delete" on public.entry_notes
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Избранное ----------
create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, entry_id)
);
alter table public.favorites enable row level security;

drop policy if exists "favorites: own read" on public.favorites;
create policy "favorites: own read" on public.favorites
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "favorites: own insert" on public.favorites;
create policy "favorites: own insert" on public.favorites
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.entries e where e.id = favorites.entry_id)
  );
drop policy if exists "favorites: own delete" on public.favorites;
create policy "favorites: own delete" on public.favorites
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Связанные записи ----------
-- label: как связь выглядит со стороны from-записи («Состоит во фракции»)
-- reverse_label: как она выглядит со стороны to-записи («Участник»)
create table if not exists public.entry_links (
  id uuid primary key default gen_random_uuid(),
  from_entry_id uuid not null references public.entries(id) on delete cascade,
  to_entry_id uuid not null references public.entries(id) on delete cascade,
  label text,
  reverse_label text,
  created_at timestamptz not null default now(),
  check (from_entry_id <> to_entry_id),
  unique (from_entry_id, to_entry_id)
);
create index if not exists entry_links_from_idx on public.entry_links (from_entry_id);
create index if not exists entry_links_to_idx on public.entry_links (to_entry_id);
alter table public.entry_links enable row level security;

-- Игрок видит связь только если ОБЕ записи ему открыты (скрытые записи не раскрываются через связи)
drop policy if exists "links: read visible" on public.entry_links;
create policy "links: read visible" on public.entry_links
  for select to authenticated using (
    exists (select 1 from public.entries e where e.id = entry_links.from_entry_id)
    and exists (select 1 from public.entries e where e.id = entry_links.to_entry_id)
  );
drop policy if exists "links: dm write" on public.entry_links;
create policy "links: dm write" on public.entry_links
  for all to authenticated using (public.is_dm()) with check (public.is_dm());
