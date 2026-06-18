-- =============================================================================
-- Migration 009: workspace_members SELECT-Policy erweitern
-- Problem: Policy aus 007 zeigt nur die eigene Zeile (user_id = auth.uid()).
-- Andere Mitglieder desselben Workspace sind dadurch unsichtbar.
-- Fix: Security-definer-Funktion, die die Workspace-IDs des aktuellen Nutzers
-- liefert, ohne RLS auf workspace_members auszuloesen. Damit koennen alle
-- Mitglieder einer Workspace gelesen werden, ohne Rekursion.
-- =============================================================================

-- Hilfsfunktion: gibt alle workspace_ids zurueck, in denen auth.uid() Mitglied ist.
-- security definer -> umgeht RLS auf workspace_members, verhindert Rekursion.
create or replace function public.get_my_workspace_ids()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select workspace_id from public.workspace_members where user_id = auth.uid();
$$;

-- Alte Policy entfernen und durch die erweiterte ersetzen
drop policy if exists "Mitgliederliste: Workspace-Mitglieder koennen lesen" on public.workspace_members;
drop policy if exists "Mitgliederliste: Mitglieder koennen lesen" on public.workspace_members;

create policy "Mitgliederliste: Workspace-Mitglieder koennen lesen"
  on public.workspace_members
  for select
  to authenticated
  using (workspace_id in (select public.get_my_workspace_ids()));
