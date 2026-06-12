-- ============================================================================
-- LGSD - Let's Get Shit Done
-- Supabase Schema, RLS Policies, Functions & Triggers
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron with schema extensions;

-- ----------------------------------------------------------------------------
-- PROFILES (extends auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Nutzer',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles: jeder eingeloggte Nutzer kann lesen"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Profiles: Nutzer kann eigenes Profil bearbeiten"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Automatisch Profil anlegen, wenn ein neuer Auth-User erstellt wird
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ----------------------------------------------------------------------------
-- WORKSPACES
-- ----------------------------------------------------------------------------
create table public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

create index workspace_invites_workspace_status_idx on public.workspace_invites (workspace_id, status);

-- Helper: ist der aktuelle Nutzer Mitglied eines Workspaces?
-- (security definer, um RLS-Rekursion auf workspace_members zu vermeiden)
create or replace function public.is_workspace_member(_workspace_id uuid, _user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = _workspace_id and wm.user_id = _user_id
  );
$$;

-- Helper: E-Mail-Adresse des aktuellen Nutzers (security definer, da "authenticated"
-- kein direktes SELECT-Recht auf auth.users hat)
create or replace function public.current_user_email()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select email from auth.users where id = auth.uid();
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

create policy "Workspaces: Mitglieder koennen lesen"
  on public.workspaces for select
  to authenticated
  using (created_by = auth.uid() or public.is_workspace_member(id, auth.uid()));

create policy "Workspaces: eingeloggte Nutzer koennen erstellen"
  on public.workspaces for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Workspaces: Ersteller kann bearbeiten"
  on public.workspaces for update
  to authenticated
  using (created_by = auth.uid());

create policy "Workspaces: Ersteller kann loeschen"
  on public.workspaces for delete
  to authenticated
  using (created_by = auth.uid());

create policy "Mitgliederliste: Mitglieder koennen lesen"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Mitgliederliste: Beitritt per eigener User-ID"
  on public.workspace_members for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Mitgliederliste: Mitglied kann sich selbst entfernen"
  on public.workspace_members for delete
  to authenticated
  using (user_id = auth.uid());

create policy "Invites: sichtbar fuer Eingeladene und Workspace-Mitglieder"
  on public.workspace_invites for select
  to authenticated
  using (
    invited_email = public.current_user_email()
    or public.is_workspace_member(workspace_id, auth.uid())
  );

create policy "Invites: Mitglieder koennen einladen"
  on public.workspace_invites for insert
  to authenticated
  with check (public.is_workspace_member(workspace_id, auth.uid()) and invited_by = auth.uid());

create policy "Invites: Eingeladener oder Einladender kann Status aendern"
  on public.workspace_invites for update
  to authenticated
  using (
    invited_email = public.current_user_email()
    or public.is_workspace_member(workspace_id, auth.uid())
  );

-- Wenn ein neuer Nutzer registriert wird (oder sich einloggt), offene Einladungen
-- fuer seine E-Mail-Adresse automatisch in Mitgliedschaften umwandeln.
create or replace function public.accept_pending_invites()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id)
  select wi.workspace_id, new.id
  from public.workspace_invites wi
  where wi.invited_email = new.email and wi.status = 'pending'
  on conflict do nothing;

  update public.workspace_invites
  set status = 'accepted'
  where invited_email = new.email and status = 'pending';

  return new;
end;
$$;

create trigger on_auth_user_created_accept_invites
  after insert on auth.users
  for each row execute procedure public.accept_pending_invites();

-- Wird beim Erstellen einer Einladung aufgerufen: existiert bereits ein Account
-- mit dieser E-Mail, wird die Person sofort als Mitglied hinzugefuegt.
create or replace function public.try_add_existing_user_to_workspace(
  _workspace_id uuid,
  _email text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _user_id uuid;
begin
  select id into _user_id from auth.users where email = _email limit 1;

  if _user_id is not null then
    insert into public.workspace_members (workspace_id, user_id)
    values (_workspace_id, _user_id)
    on conflict do nothing;

    update public.workspace_invites
    set status = 'accepted'
    where workspace_id = _workspace_id and invited_email = _email and status = 'pending';
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- TODOS
-- ----------------------------------------------------------------------------
create table public.todos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null,
  date date not null,
  is_recurring boolean not null default false,
  recurrence_type text check (recurrence_type in ('daily', 'weekly', 'monthly')),
  recurrence_parent_id uuid references public.todos (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'pending', 'confirmed', 'rejected', 'missed')),
  penalized boolean not null default false,
  shift_count integer not null default 0,
  shift_request_date date,
  shift_request_reason text,
  shift_request_status text not null default 'none' check (shift_request_status in ('none', 'pending', 'approved', 'rejected')),
  shift_auto_approved boolean not null default false,
  suggested_points integer not null default 5 check (suggested_points in (1, 3, 5, 7, 9)),
  created_at timestamptz not null default now()
);

create index todos_workspace_date_idx on public.todos (workspace_id, date);
create index todos_user_date_idx on public.todos (user_id, date);

create table public.todo_proof (
  id uuid primary key default uuid_generate_v4(),
  todo_id uuid not null references public.todos (id) on delete cascade,
  file_url text not null,
  uploaded_at timestamptz not null default now()
);

create index todo_proof_todo_idx on public.todo_proof (todo_id);

create table public.todo_confirmations (
  id uuid primary key default uuid_generate_v4(),
  todo_id uuid not null references public.todos (id) on delete cascade,
  confirmed_by uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('confirmed', 'requested_proof')),
  comment text,
  created_at timestamptz not null default now()
);

create index todo_confirmations_todo_idx on public.todo_confirmations (todo_id);

alter table public.todos enable row level security;
alter table public.todo_proof enable row level security;
alter table public.todo_confirmations enable row level security;

create policy "Todos: Workspace-Mitglieder koennen lesen"
  on public.todos for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Todos: eigene Todos erstellen"
  on public.todos for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_workspace_member(workspace_id, auth.uid()));

create policy "Todos: eigene Todos bearbeiten"
  on public.todos for update
  to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id, auth.uid()));

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

create policy "Beweise: Workspace-Mitglieder koennen lesen"
  on public.todo_proof for select
  to authenticated
  using (
    exists (
      select 1 from public.todos t
      where t.id = todo_id and public.is_workspace_member(t.workspace_id, auth.uid())
    )
  );

create policy "Beweise: Eigentuemer des Todos kann hochladen"
  on public.todo_proof for insert
  to authenticated
  with check (
    exists (
      select 1 from public.todos t
      where t.id = todo_id and t.user_id = auth.uid()
    )
  );

create policy "Bestaetigungen: Workspace-Mitglieder koennen lesen"
  on public.todo_confirmations for select
  to authenticated
  using (
    exists (
      select 1 from public.todos t
      where t.id = todo_id and public.is_workspace_member(t.workspace_id, auth.uid())
    )
  );

create policy "Bestaetigungen: Workspace-Mitglieder koennen bestaetigen"
  on public.todo_confirmations for insert
  to authenticated
  with check (
    confirmed_by = auth.uid()
    and exists (
      select 1 from public.todos t
      where t.id = todo_id and public.is_workspace_member(t.workspace_id, auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- POINTS & STREAKS
-- ----------------------------------------------------------------------------
create table public.points (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  todo_id uuid references public.todos (id) on delete set null,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index points_user_workspace_created_idx on public.points (user_id, workspace_id, created_at desc);
create index points_workspace_idx on public.points (workspace_id);

create table public.streaks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  current_streak integer not null default 0,
  last_active_date date,
  primary key (user_id, workspace_id)
);

alter table public.points enable row level security;
alter table public.streaks enable row level security;

create policy "Punkte: Workspace-Mitglieder koennen lesen"
  on public.points for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Streaks: Workspace-Mitglieder koennen lesen"
  on public.streaks for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

-- ----------------------------------------------------------------------------
-- GOALS
-- ----------------------------------------------------------------------------
create table public.monthly_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  month date not null, -- always 1st day of month
  target_points integer not null check (target_points > 0),
  reward_text text not null,
  achieved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, workspace_id, month)
);

create table public.weekly_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  week_start date not null, -- always a Monday
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.monthly_goals enable row level security;
alter table public.weekly_goals enable row level security;

create policy "Monatsziele: eigene Ziele lesen"
  on public.monthly_goals for select
  to authenticated
  using (user_id = auth.uid() or public.is_workspace_member(workspace_id, auth.uid()));

create policy "Monatsziele: eigene Ziele verwalten (insert)"
  on public.monthly_goals for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Monatsziele: eigene Ziele verwalten (update)"
  on public.monthly_goals for update
  to authenticated
  using (user_id = auth.uid());

create policy "Wochenziele: Workspace-Mitglieder koennen lesen"
  on public.weekly_goals for select
  to authenticated
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Wochenziele: eigene Ziele verwalten (insert)"
  on public.weekly_goals for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Wochenziele: eigene Ziele verwalten (update)"
  on public.weekly_goals for update
  to authenticated
  using (user_id = auth.uid());

create policy "Wochenziele: eigene Ziele verwalten (delete)"
  on public.weekly_goals for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- POINTS / STREAK / GOAL HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

-- Vergibt Punkte und aktualisiert Streak + Monatsziel-Fortschritt
create or replace function public.award_points(
  _user_id uuid,
  _workspace_id uuid,
  _todo_id uuid,
  _amount integer,
  _reason text
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.points (user_id, workspace_id, todo_id, amount, reason)
  values (_user_id, _workspace_id, _todo_id, _amount, _reason);

  -- Monatsziel-Fortschritt pruefen
  perform public.check_monthly_goal(_user_id, _workspace_id);
end;
$$;

-- Prueft, ob das aktuelle Monatsziel erreicht wurde, und markiert es entsprechend
create or replace function public.check_monthly_goal(_user_id uuid, _workspace_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _month date := date_trunc('month', now())::date;
  _total integer;
  _goal record;
begin
  select * into _goal
  from public.monthly_goals
  where user_id = _user_id and workspace_id = _workspace_id and month = _month
  limit 1;

  if _goal is null then
    return;
  end if;

  select coalesce(sum(amount), 0) into _total
  from public.points
  where user_id = _user_id
    and workspace_id = _workspace_id
    and created_at >= _month
    and created_at < (_month + interval '1 month');

  if _total >= _goal.target_points and not _goal.achieved then
    update public.monthly_goals set achieved = true where id = _goal.id;
  elsif _total < _goal.target_points and _goal.achieved then
    update public.monthly_goals set achieved = false where id = _goal.id;
  end if;
end;
$$;

-- Aktualisiert die Streak eines Nutzers, wenn ein Todo bestaetigt wird.
-- Gibt die Anzahl an Bonus-Punkten zurueck (ab Tag 3 in Folge: +2)
create or replace function public.bump_streak(_user_id uuid, _workspace_id uuid, _todo_date date)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  _streak record;
  _new_streak integer;
  _bonus integer := 0;
begin
  select * into _streak
  from public.streaks
  where user_id = _user_id and workspace_id = _workspace_id
  for update;

  if _streak is null then
    _new_streak := 1;
    insert into public.streaks (user_id, workspace_id, current_streak, last_active_date)
    values (_user_id, _workspace_id, _new_streak, _todo_date);
  else
    if _streak.last_active_date = _todo_date then
      -- gleicher Tag, Streak bleibt gleich
      _new_streak := _streak.current_streak;
    elsif _streak.last_active_date = _todo_date - interval '1 day' then
      _new_streak := _streak.current_streak + 1;
    elsif _streak.last_active_date < _todo_date then
      -- Luecke -> Streak beginnt neu
      _new_streak := 1;
    else
      -- Bestaetigung fuer einen Tag vor dem letzten aktiven Tag (rueckwirkend) -> Streak unveraendert
      _new_streak := _streak.current_streak;
    end if;

    update public.streaks
    set current_streak = _new_streak,
        last_active_date = greatest(_streak.last_active_date, _todo_date)
    where user_id = _user_id and workspace_id = _workspace_id;
  end if;

  if _new_streak >= 3 then
    _bonus := 2;
  end if;

  return _bonus;
end;
$$;

-- ----------------------------------------------------------------------------
-- TODO ACTIONS (Status-Flow)
-- ----------------------------------------------------------------------------

-- Nutzer markiert eigenes Todo als "fertig" -> Status wird "pending" (ausstehend).
-- Ist der Nutzer das einzige Mitglied des Workspaces, gilt die Aufgabe sofort
-- als bestaetigt und die Punkte werden direkt vergeben.
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

-- Workspace-Mitglied bestaetigt ein Todo -> Punkte + Streak werden vergeben.
-- _points: vom Bestaetiger festgelegte Punktzahl (1/3/5/7/9). Ohne Angabe wird
-- der Punktevorschlag des Erstellers (suggested_points) verwendet.
-- Funktioniert auch nachtraeglich: bereits vergebene Minuspunkte (Reason 'penalty_missed')
-- werden ausgeglichen (+5).
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

-- Workspace-Mitglied fordert einen Beweis an -> Status "rejected"
create or replace function public.request_todo_proof(_todo_id uuid, _comment text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo public.todos;
begin
  select * into _todo from public.todos where id = _todo_id;

  if _todo is null then
    raise exception 'Todo nicht gefunden';
  end if;

  if not public.is_workspace_member(_todo.workspace_id, auth.uid()) then
    raise exception 'Nicht erlaubt';
  end if;

  if _todo.status <> 'pending' then
    raise exception 'Beweis kann nur fuer ausstehende Todos angefordert werden';
  end if;

  insert into public.todo_confirmations (todo_id, confirmed_by, action, comment)
  values (_todo_id, auth.uid(), 'requested_proof', _comment);

  update public.todos set status = 'rejected' where id = _todo_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- AUFGABE VERSCHIEBEN (Antragssystem)
-- ----------------------------------------------------------------------------

-- Eigentuemer beantragt eine Verschiebung der Aufgabe auf ein neues Datum.
-- Max. 3 Verschiebungen pro Aufgabe.
create or replace function public.request_todo_shift(_todo_id uuid, _new_date date, _reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo public.todos;
begin
  select * into _todo from public.todos where id = _todo_id;

  if _todo is null or _todo.user_id <> auth.uid() then
    raise exception 'Nicht erlaubt';
  end if;

  if _todo.shift_count >= 3 then
    raise exception 'Maximale Anzahl an Verschiebungen erreicht';
  end if;

  if _todo.shift_request_status = 'pending' then
    raise exception 'Es liegt bereits ein Verschiebungsantrag vor';
  end if;

  if _new_date is null or trim(coalesce(_reason, '')) = '' then
    raise exception 'Bitte Datum und Grund angeben';
  end if;

  update public.todos
  set shift_request_date = _new_date,
      shift_request_reason = _reason,
      shift_request_status = 'pending'
  where id = _todo_id;
end;
$$;

-- Workspace-Mitglied entscheidet ueber einen Verschiebungsantrag.
-- _decision: 'approve_no_penalty' | 'approve_with_penalty' | 'reject'
create or replace function public.resolve_todo_shift(_todo_id uuid, _decision text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo public.todos;
  _penalties integer[] := array[3, 6, 10];
  _penalty integer;
begin
  select * into _todo from public.todos where id = _todo_id;

  if _todo is null then
    raise exception 'Todo nicht gefunden';
  end if;

  if not public.is_workspace_member(_todo.workspace_id, auth.uid()) then
    raise exception 'Nicht erlaubt';
  end if;

  if _todo.shift_request_status <> 'pending' then
    raise exception 'Kein offener Verschiebungsantrag';
  end if;

  if _decision = 'reject' then
    update public.todos
    set shift_request_status = 'none',
        shift_request_date = null,
        shift_request_reason = null
    where id = _todo_id;
    return;
  end if;

  if _decision not in ('approve_no_penalty', 'approve_with_penalty') then
    raise exception 'Ungueltige Entscheidung';
  end if;

  update public.todos
  set date = _todo.shift_request_date,
      shift_count = _todo.shift_count + 1,
      shift_request_status = 'none',
      shift_request_date = null,
      shift_request_reason = null,
      shift_auto_approved = false
  where id = _todo_id;

  if _decision = 'approve_with_penalty' then
    _penalty := _penalties[least(_todo.shift_count + 1, 3)];
    perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, -_penalty, 'shift_penalty');
  end if;
end;
$$;

-- ----------------------------------------------------------------------------
-- MITTERNACHTS-JOB: Strafpunkte fuer verpasste Todos + wiederkehrende Todos erzeugen
-- ----------------------------------------------------------------------------
create or replace function public.run_daily_maintenance()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _todo record;
  _next_date date;
begin
  -- 1. Offene Verschiebungsantraege, die bis Mitternacht nicht entschieden wurden,
  --    automatisch verschieben (ohne Punktabzug) und amber markieren.
  for _todo in
    select * from public.todos
    where shift_request_status = 'pending'
      and date < current_date
  loop
    update public.todos
    set date = coalesce(_todo.shift_request_date, _todo.date + interval '1 day'),
        shift_count = _todo.shift_count + 1,
        shift_request_status = 'none',
        shift_request_date = null,
        shift_request_reason = null,
        shift_auto_approved = true
    where id = _todo.id;
  end loop;

  -- 2. Strafpunkte fuer offene/ueberfaellige Todos vergeben
  for _todo in
    select * from public.todos
    where date < current_date
      and status in ('open', 'rejected')
      and penalized = false
  loop
    update public.todos set status = 'missed', penalized = true where id = _todo.id;
    perform public.award_points(_todo.user_id, _todo.workspace_id, _todo.id, -5, 'penalty_missed');

    -- Streak zuruecksetzen, wenn der verpasste Tag direkt nach dem letzten aktiven Tag lag
    update public.streaks
    set current_streak = 0
    where user_id = _todo.user_id
      and workspace_id = _todo.workspace_id
      and (last_active_date is null or last_active_date < _todo.date);
  end loop;

  -- 3. Naechste Instanz wiederkehrender Todos erzeugen
  for _todo in
    select * from public.todos
    where is_recurring = true
      and date = current_date - interval '1 day'
  loop
    _next_date := case _todo.recurrence_type
      when 'daily' then _todo.date + interval '1 day'
      when 'weekly' then _todo.date + interval '7 day'
      when 'monthly' then _todo.date + interval '1 month'
      else null
    end;

    if _next_date is not null then
      insert into public.todos (user_id, workspace_id, title, date, is_recurring, recurrence_type, recurrence_parent_id)
      values (
        _todo.user_id,
        _todo.workspace_id,
        _todo.title,
        _next_date,
        true,
        _todo.recurrence_type,
        coalesce(_todo.recurrence_parent_id, _todo.id)
      );
    end if;
  end loop;
end;
$$;

-- Taeglich um Mitternacht (Server-Zeit) ausfuehren
select cron.schedule(
  'lgsd-daily-maintenance',
  '0 0 * * *',
  $$select public.run_daily_maintenance();$$
);

-- ----------------------------------------------------------------------------
-- STORAGE: Bucket fuer Beweis-Uploads
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('todo-proofs', 'todo-proofs', true)
on conflict (id) do nothing;

create policy "Beweis-Uploads: Lesen fuer alle"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'todo-proofs');

create policy "Beweis-Uploads: eigene Datei hochladen"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'todo-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ----------------------------------------------------------------------------
-- REALTIME: Aenderungen an Todos, Punkten und Streaks live an Workspace-Mitglieder
-- ----------------------------------------------------------------------------
alter publication supabase_realtime add table public.todos;
alter publication supabase_realtime add table public.points;
alter publication supabase_realtime add table public.streaks;
