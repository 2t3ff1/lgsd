-- =============================================================================
-- Migration 016: Bugfixes & neue Features
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. text_color Spalte sicherstellen (falls Migration 015 nicht angewendet)
-- -------------------------------------------------------------------------
alter table public.profiles
  add column if not exists text_color text,
  add column if not exists card_color text,
  add column if not exists background_color text,
  add column if not exists background_image_url text;

-- Profiles UPDATE-Policy sicherstellen (eigenes Profil bearbeiten)
drop policy if exists "Profiles: eigenes Profil bearbeiten" on public.profiles;
create policy "Profiles: eigenes Profil bearbeiten"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -------------------------------------------------------------------------
-- 2. Minuspunkte auf 0 zurücksetzen
-- Nutzer mit negativer Gesamtpunktzahl (pro Workspace) erhalten einen
-- Ausgleichseintrag, sodass ihr Kontostand wieder 0 ist.
-- -------------------------------------------------------------------------
insert into public.points (user_id, workspace_id, todo_id, amount, reason)
select
  p.user_id,
  p.workspace_id,
  null,
  abs(sum(p.amount)) as amount,
  'admin_reset_negative'
from public.points p
group by p.user_id, p.workspace_id
having sum(p.amount) < 0;

-- -------------------------------------------------------------------------
-- 3. mark_todo_done: Auch verpasste Aufgaben vom Vortag nachträglich abhaken
-- Aufgaben von gestern (date >= current_date - 1) dürfen auch bei
-- status='missed' noch als erledigt markiert werden.
-- -------------------------------------------------------------------------
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

  -- Verpasste Aufgaben von gestern können noch abgehakt werden
  if _todo.status = 'missed' then
    if _todo.date < current_date - interval '1 day' then
      raise exception 'Diese Aufgabe liegt zu weit in der Vergangenheit';
    end if;
    -- Penalty bleibt bestehen bis Bestätigung (confirm_todo reversed es)
    update public.todos set status = 'pending' where id = _todo_id;
    return;
  end if;

  if _todo.status not in ('open', 'rejected') then
    raise exception 'Todo kann in diesem Status nicht abgeschlossen werden';
  end if;

  update public.todos set status = 'pending', shift_auto_approved = false where id = _todo_id;
end;
$$;

-- -------------------------------------------------------------------------
-- 4. todos UPDATE-Policy für Ersteller (Aufgabe bearbeiten)
-- -------------------------------------------------------------------------
drop policy if exists "Todos: eigene Todos bearbeiten" on public.todos;
create policy "Todos: eigene Todos bearbeiten"
  on public.todos for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 7. Wochen-Commitments Cron-Job deaktivieren
-- Keine Minuspunkte mehr für fehlende Wochen-Commitments.
-- -------------------------------------------------------------------------
select cron.unschedule('lgsd-weekly-commitment-check');
