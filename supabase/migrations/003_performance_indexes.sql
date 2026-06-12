-- ============================================================================
-- Migration 003: Performance-Indizes fuer haeufige Abfragen
-- ============================================================================
-- Fuehre dieses Skript einmal komplett im Supabase SQL Editor aus.
-- Es ist sicher erneut ausfuehrbar (IF NOT EXISTS).
-- ============================================================================

-- Punktehistorie / Monatspunkte pro Nutzer & Workspace (Dashboard, Profil)
create index if not exists points_user_workspace_created_idx
  on public.points (user_id, workspace_id, created_at desc);

-- Punkte-Summen pro Workspace (Leaderboard)
create index if not exists points_workspace_idx
  on public.points (workspace_id);

-- Beweise/Bestaetigungen pro Todo (workspace-Ansicht laedt diese per .in(todoIds))
create index if not exists todo_proof_todo_idx
  on public.todo_proof (todo_id);

create index if not exists todo_confirmations_todo_idx
  on public.todo_confirmations (todo_id);

-- Offene Einladungen pro Workspace (Einstellungsseite)
create index if not exists workspace_invites_workspace_status_idx
  on public.workspace_invites (workspace_id, status);

-- Mitgliedschaften pro Nutzer (Dashboard, Profil)
create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);
