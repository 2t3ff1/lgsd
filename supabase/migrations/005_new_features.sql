-- =============================================================================
-- Migration 005: Uhrzeit fuer Todos, Erinnerungszeit, Zettel-Tafel
-- Sicher erneut ausfuehrbar (idempotent)
-- =============================================================================

-- Uhrzeit fuer Aufgaben
alter table public.todos
  add column if not exists scheduled_time time without time zone;

-- Taeliche Erinnerungszeit im Profil
alter table public.profiles
  add column if not exists reminder_time time without time zone;

-- Zettel-Tafel (Pinnwand)
create table if not exists public.notes (
  id           uuid        primary key default gen_random_uuid(),
  workspace_id uuid        not null references public.workspaces(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id)   on delete cascade,
  content      text        not null check (char_length(content) between 1 and 500),
  color        text        not null default 'yellow',
  created_at   timestamptz not null default now()
);

create table if not exists public.note_replies (
  id         uuid        primary key default gen_random_uuid(),
  note_id    uuid        not null references public.notes(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- RLS: notes
alter table public.notes enable row level security;

drop policy if exists "Notes: lesen" on public.notes;
create policy "Notes: lesen" on public.notes
  for select using (is_workspace_member(workspace_id));

drop policy if exists "Notes: erstellen" on public.notes;
create policy "Notes: erstellen" on public.notes
  for insert with check (is_workspace_member(workspace_id) and user_id = auth.uid());

drop policy if exists "Notes: loeschen" on public.notes;
create policy "Notes: loeschen" on public.notes
  for delete using (is_workspace_member(workspace_id));

-- RLS: note_replies
alter table public.note_replies enable row level security;

drop policy if exists "NoteReplies: lesen" on public.note_replies;
create policy "NoteReplies: lesen" on public.note_replies
  for select using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and is_workspace_member(n.workspace_id)
    )
  );

drop policy if exists "NoteReplies: erstellen" on public.note_replies;
create policy "NoteReplies: erstellen" on public.note_replies
  for insert with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.notes n
      where n.id = note_id and is_workspace_member(n.workspace_id)
    )
  );

drop policy if exists "NoteReplies: loeschen" on public.note_replies;
create policy "NoteReplies: loeschen" on public.note_replies
  for delete using (
    exists (
      select 1 from public.notes n
      where n.id = note_id and is_workspace_member(n.workspace_id)
    )
  );

-- Realtime fuer notes und note_replies
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'notes'
  ) then
    alter publication supabase_realtime add table public.notes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'note_replies'
  ) then
    alter publication supabase_realtime add table public.note_replies;
  end if;
end $$;
