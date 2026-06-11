-- ============================================================================
-- Migration 002: "Aufgabe verschieben" Antragssystem
-- ============================================================================
-- Fuehre dieses Skript einmal komplett im Supabase SQL Editor aus.
-- Es ist sicher erneut ausfuehrbar (CREATE OR REPLACE / IF NOT EXISTS).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Neue Spalten in der todos-Tabelle
-- ----------------------------------------------------------------------------
alter table public.todos
  add column if not exists shift_count integer not null default 0,
  add column if not exists shift_request_date date,
  add column if not exists shift_request_reason text,
  add column if not exists shift_request_status text not null default 'none',
  add column if not exists shift_auto_approved boolean not null default false;

-- Check-Constraint fuer shift_request_status (idempotent: erst entfernen, dann anlegen)
alter table public.todos
  drop constraint if exists todos_shift_request_status_check;

alter table public.todos
  add constraint todos_shift_request_status_check
  check (shift_request_status in ('none', 'pending', 'approved', 'rejected'));

-- ----------------------------------------------------------------------------
-- 2. mark_todo_done: Auto-Verschiebungs-Markierung beim naechsten Bearbeiten zuruecksetzen
-- ----------------------------------------------------------------------------
create or replace function public.mark_todo_done(_todo_id uuid)
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

  if _todo.status not in ('open', 'rejected') then
    raise exception 'Todo kann in diesem Status nicht abgeschlossen werden';
  end if;

  update public.todos set status = 'pending', shift_auto_approved = false where id = _todo_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. Verschiebungsantrag stellen (Eigentuemer, max. 3x)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 4. Verschiebungsantrag genehmigen/ablehnen (Workspace-Mitglieder)
-- ----------------------------------------------------------------------------
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
-- 5. Mitternachts-Job: pending Verschiebungsantraege automatisch verschieben,
--    bevor Strafpunkte fuer ueberfaellige Aufgaben vergeben werden.
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
