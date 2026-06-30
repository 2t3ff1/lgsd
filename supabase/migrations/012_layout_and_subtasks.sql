-- =============================================================================
-- Migration 012: Fristaufgaben, Unteraufgaben, Textfarbe
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. FRISTAUFGABEN (Deadline statt festes Datum)
-- "date" speichert weiterhin das relevante Faelligkeitsdatum (= deadline_date
-- bei Fristaufgaben), damit bestehende Sortierungen/Strafpunkt-Logik in
-- run_daily_maintenance unveraendert funktionieren. start_date markiert den
-- Beginn des Zeitraums, in dem die Aufgabe im "Heute"-Bereich erscheint.
-- -------------------------------------------------------------------------
alter table public.todos
  add column if not exists is_deadline_task boolean not null default false,
  add column if not exists start_date date,
  add column if not exists deadline_date date;

-- -------------------------------------------------------------------------
-- 2. TEXTFARBE (Profil-Personalisierung)
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists text_color text;

-- -------------------------------------------------------------------------
-- 3. UNTERAUFGABEN
-- -------------------------------------------------------------------------
create table if not exists public.subtasks (
  id uuid primary key default uuid_generate_v4(),
  parent_todo_id uuid not null references public.todos (id) on delete cascade,
  title text not null,
  suggested_points integer not null default 5 check (suggested_points in (1, 3, 5, 7, 9)),
  status text not null default 'open' check (status in ('open', 'pending', 'confirmed', 'rejected', 'missed')),
  confirmed_by uuid references public.profiles (id),
  confirmed_points integer,
  created_at timestamptz not null default now()
);

create index if not exists subtasks_parent_idx on public.subtasks (parent_todo_id);

alter table public.subtasks enable row level security;

drop policy if exists "Unteraufgaben: Workspace-Mitglieder koennen lesen" on public.subtasks;
create policy "Unteraufgaben: Workspace-Mitglieder koennen lesen"
  on public.subtasks for select to authenticated
  using (
    exists (
      select 1 from public.todos t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = parent_todo_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Unteraufgaben: Eigentuemer der Hauptaufgabe kann erstellen" on public.subtasks;
create policy "Unteraufgaben: Eigentuemer der Hauptaufgabe kann erstellen"
  on public.subtasks for insert to authenticated
  with check (
    exists (
      select 1 from public.todos t
      where t.id = parent_todo_id and t.user_id = auth.uid()
    )
  );

drop policy if exists "Unteraufgaben: Eigentuemer kann offene Unteraufgabe loeschen" on public.subtasks;
create policy "Unteraufgaben: Eigentuemer kann offene Unteraufgabe loeschen"
  on public.subtasks for delete to authenticated
  using (
    status = 'open'
    and exists (
      select 1 from public.todos t
      where t.id = parent_todo_id and t.user_id = auth.uid()
    )
  );

-- Eigentuemer der Hauptaufgabe markiert eine Unteraufgabe als erledigt.
-- Bei Solo-Workspace wird sofort bestaetigt (analog mark_todo_done).
create or replace function public.mark_subtask_done(_subtask_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _subtask public.subtasks;
  _todo public.todos;
  _member_count integer;
begin
  select * into _subtask from public.subtasks where id = _subtask_id;
  if _subtask is null then
    raise exception 'Unteraufgabe nicht gefunden';
  end if;

  select * into _todo from public.todos where id = _subtask.parent_todo_id;
  if _todo is null or _todo.user_id <> auth.uid() then
    raise exception 'Nicht erlaubt';
  end if;

  if _subtask.status not in ('open', 'rejected') then
    raise exception 'Unteraufgabe kann in diesem Status nicht abgeschlossen werden';
  end if;

  select count(*) into _member_count
  from public.workspace_members
  where workspace_id = _todo.workspace_id;

  update public.subtasks set status = 'pending' where id = _subtask_id;

  if _member_count <= 1 then
    perform public.confirm_subtask(_subtask_id, _subtask.suggested_points);
  end if;
end;
$$;

-- Workspace-Mitglied bestaetigt eine Unteraufgabe -> Punkte gehen an die
-- Hauptaufgabe (award_points mit todo_id = parent_todo_id). Sind danach
-- alle Unteraufgaben bestaetigt, wird die Hauptaufgabe als bestaetigt
-- markiert und die Streak aktualisiert.
create or replace function public.confirm_subtask(_subtask_id uuid, _points integer)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _subtask public.subtasks;
  _todo public.todos;
  _open_siblings integer;
  _bonus integer;
begin
  select * into _subtask from public.subtasks where id = _subtask_id;
  if _subtask is null then
    raise exception 'Unteraufgabe nicht gefunden';
  end if;

  select * into _todo from public.todos where id = _subtask.parent_todo_id;
  if _todo is null then
    raise exception 'Hauptaufgabe nicht gefunden';
  end if;

  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = _todo.workspace_id and wm.user_id = auth.uid()
  ) then
    raise exception 'Nicht erlaubt';
  end if;

  if _subtask.status not in ('pending', 'rejected', 'missed') then
    raise exception 'Unteraufgabe kann in diesem Status nicht bestaetigt werden';
  end if;

  if _points not in (1, 3, 5, 7, 9) then
    raise exception 'Ungueltige Punktzahl';
  end if;

  update public.subtasks
  set status = 'confirmed', confirmed_by = auth.uid(), confirmed_points = _points
  where id = _subtask_id;

  perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, _points, 'subtask_confirmed');

  select count(*) into _open_siblings
  from public.subtasks
  where parent_todo_id = _todo.id and status <> 'confirmed';

  if _open_siblings = 0 and _todo.status <> 'confirmed' then
    update public.todos set status = 'confirmed', penalized = false where id = _todo.id;
    _bonus := public.bump_streak(_todo.user_id, _todo.workspace_id, _todo.date);
    if _bonus > 0 then
      perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, _bonus, 'streak_bonus');
    end if;
  end if;
end;
$$;

alter publication supabase_realtime add table public.subtasks;
