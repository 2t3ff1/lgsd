-- =============================================================================
-- Migration 007: workspace_members SELECT-Policy vereinfachen
-- Problem: Die bisherige Policy ruft is_workspace_member() auf, die selbst
-- workspace_members abfragt. Das kann zu RLS-Rekursion fuehren und dazu,
-- dass auth.uid() im inneren Call null zurueckgibt.
-- Fix: Direkter Check user_id = auth.uid() — kein rekursiver Aufruf.
-- =============================================================================

drop policy if exists "Mitgliederliste: Workspace-Mitglieder koennen lesen" on public.workspace_members;

create policy "Mitgliederliste: Workspace-Mitglieder koennen lesen"
  on public.workspace_members
  for select
  to authenticated
  using (user_id = auth.uid());
