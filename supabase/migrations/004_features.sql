-- ============================================================================
-- Migration 004: Bugfixes & neue Features
-- ============================================================================
-- Fuehre dieses Skript einmal komplett im Supabase SQL Editor aus.
-- Es ist sicher erneut ausfuehrbar.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Fix: "permission denied for table users" beim Laden der Workspace-
--    Einstellungen. Die alte RLS-Policy fuer workspace_invites griff direkt
--    auf auth.users zu, worauf die Rolle "authenticated" kein SELECT-Recht
--    hat. Stattdessen ueber eine security-definer Hilfsfunktion abfragen.
-- ----------------------------------------------------------------------------
create or replace function public.current_user_email()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from auth.users where id = auth.uid();
$$;

drop policy if exists "Invites: sichtbar fuer Eingeladene und Workspace-Mitglieder" on public.workspace_invites;
create policy "Invites: sichtbar fuer Eingeladene und Workspace-Mitglieder"
  on public.workspace_invites for select
  to authenticated
  using (
    invited_email = public.current_user_email()
    or public.is_workspace_member(workspace_id, auth.uid())
  );

drop policy if exists "Invites: Eingeladener oder Einladender kann Status aendern" on public.workspace_invites;
create policy "Invites: Eingeladener oder Einladender kann Status aendern"
  on public.workspace_invites for update
  to authenticated
  using (
    invited_email = public.current_user_email()
    or public.is_workspace_member(workspace_id, auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 2) Punktevorschlag pro Aufgabe (1, 3, 5, 7, 9 - Default 5)
-- ----------------------------------------------------------------------------
alter table public.todos
  add column if not exists suggested_points integer not null default 5;

alter table public.todos drop constraint if exists todos_suggested_points_check;
alter table public.todos
  add constraint todos_suggested_points_check check (suggested_points in (1, 3, 5, 7, 9));

-- ----------------------------------------------------------------------------
-- 3) confirm_todo: Bestaetiger legt die finalen Punkte fest
--    (uebernimmt Vorschlag oder waehlt 1/3/5/7/9 selbst)
-- ----------------------------------------------------------------------------
create or replace function public.confirm_todo(_todo_id uuid, _comment text default null, _points integer default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo public.todos;
  _bonus integer;
  _was_penalized boolean;
  _points_final integer;
begin
  select * into _todo from public.todos where id = _todo_id;

  if _todo is null then
    raise exception 'Todo nicht gefunden';
  end if;

  if not public.is_workspace_member(_todo.workspace_id, auth.uid()) then
    raise exception 'Nicht erlaubt';
  end if;

  if _todo.status not in ('pending', 'rejected', 'missed') then
    raise exception 'Todo kann in diesem Status nicht bestaetigt werden';
  end if;

  _points_final := coalesce(_points, _todo.suggested_points);
  if _points_final not in (1, 3, 5, 7, 9) then
    raise exception 'Ungueltige Punktzahl';
  end if;

  insert into public.todo_confirmations (todo_id, confirmed_by, action, comment)
  values (_todo_id, auth.uid(), 'confirmed', _comment);

  _was_penalized := _todo.penalized;

  update public.todos set status = 'confirmed', penalized = false where id = _todo_id;

  -- Falls bereits ein Strafpunkt-Abzug erfolgt war: rueckgaengig machen (+5)
  if _was_penalized then
    perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, 5, 'penalty_reversed');
  end if;

  -- Streak aktualisieren und Bonus berechnen
  _bonus := public.bump_streak(_todo.user_id, _todo.workspace_id, _todo.date);

  perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, _points_final, 'todo_confirmed');

  if _bonus > 0 then
    perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, _bonus, 'streak_bonus');
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4) mark_todo_done: ist der Nutzer alleiniges Workspace-Mitglied, gilt die
--    Aufgabe sofort als bestaetigt - keine Bestaetigung durch andere noetig.
-- ----------------------------------------------------------------------------
create or replace function public.mark_todo_done(_todo_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo public.todos;
  _member_count integer;
begin
  select * into _todo from public.todos where id = _todo_id;

  if _todo is null or _todo.user_id <> auth.uid() then
    raise exception 'Nicht erlaubt';
  end if;

  if _todo.status not in ('open', 'rejected') then
    raise exception 'Todo kann in diesem Status nicht abgeschlossen werden';
  end if;

  select count(*) into _member_count
  from public.workspace_members
  where workspace_id = _todo.workspace_id;

  update public.todos set status = 'pending', shift_auto_approved = false where id = _todo_id;

  if _member_count <= 1 then
    perform public.confirm_todo(_todo_id, null, _todo.suggested_points);
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5) Aufgaben loeschen: Workspace-Ersteller darf alle Aufgaben im eigenen
--    Workspace loeschen, andere Mitglieder nur ihre eigenen.
-- ----------------------------------------------------------------------------
drop policy if exists "Todos: eigene Todos loeschen" on public.todos;
create policy "Todos: eigene oder Workspace-Ersteller kann loeschen"
  on public.todos for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspaces w
      where w.id = workspace_id and w.created_by = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6) Realtime: Aenderungen an Todos, Punkten und Streaks live an alle
--    Workspace-Mitglieder ausliefern.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'todos'
  ) then
    alter publication supabase_realtime add table public.todos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'points'
  ) then
    alter publication supabase_realtime add table public.points;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'streaks'
  ) then
    alter publication supabase_realtime add table public.streaks;
  end if;
end $$;
