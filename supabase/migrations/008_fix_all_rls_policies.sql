-- =============================================================================
-- Migration 008: RLS-Rekursion in allen Tabellen beheben
-- Problem: is_workspace_member() wird in Policies vieler Tabellen aufgerufen.
-- Auch als security-definer-Funktion kann auth.uid() in diesem Kontext null
-- zurueckgeben, wodurch alle Zugriffscheck fehlschlagen.
-- Fix: Direkte EXISTS-Subquery gegen workspace_members statt Funktionsaufruf.
-- =============================================================================

-- -------------------------------------------------------------------------
-- WORKSPACES
-- -------------------------------------------------------------------------
drop policy if exists "Workspaces: Mitglieder koennen lesen" on public.workspaces;
create policy "Workspaces: Mitglieder koennen lesen"
  on public.workspaces for select to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- WORKSPACE_INVITES
-- -------------------------------------------------------------------------
drop policy if exists "Invites: sichtbar fuer Eingeladene und Workspace-Mitglieder" on public.workspace_invites;
create policy "Invites: sichtbar fuer Eingeladene und Workspace-Mitglieder"
  on public.workspace_invites for select to authenticated
  using (
    invited_email = public.current_user_email()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Invites: Mitglieder koennen einladen" on public.workspace_invites;
create policy "Invites: Mitglieder koennen einladen"
  on public.workspace_invites for insert to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Invites: Eingeladener oder Einladender kann Status aendern" on public.workspace_invites;
create policy "Invites: Eingeladener oder Einladender kann Status aendern"
  on public.workspace_invites for update to authenticated
  using (
    invited_email = public.current_user_email()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- TODOS
-- -------------------------------------------------------------------------
drop policy if exists "Todos: Workspace-Mitglieder koennen lesen" on public.todos;
create policy "Todos: Workspace-Mitglieder koennen lesen"
  on public.todos for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Todos: eigene Todos erstellen" on public.todos;
create policy "Todos: eigene Todos erstellen"
  on public.todos for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Todos: eigene Todos bearbeiten" on public.todos;
create policy "Todos: eigene Todos bearbeiten"
  on public.todos for update to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

-- DELETE policy already uses a direct subquery for workspace owner check — keep as-is
-- (no is_workspace_member call in the original delete policy)

-- -------------------------------------------------------------------------
-- TODO_PROOF (joins through todos)
-- -------------------------------------------------------------------------
drop policy if exists "Beweise: Workspace-Mitglieder koennen lesen" on public.todo_proof;
create policy "Beweise: Workspace-Mitglieder koennen lesen"
  on public.todo_proof for select to authenticated
  using (
    exists (
      select 1 from public.todos t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = todo_id and wm.user_id = auth.uid()
    )
  );

-- INSERT policy already uses direct subquery (t.user_id = auth.uid()) — no change needed
-- but drop + recreate for safety
drop policy if exists "Beweise: Eigentuemer des Todos kann hochladen" on public.todo_proof;
create policy "Beweise: Eigentuemer des Todos kann hochladen"
  on public.todo_proof for insert to authenticated
  with check (
    exists (
      select 1 from public.todos t
      where t.id = todo_id and t.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- TODO_CONFIRMATIONS (joins through todos)
-- -------------------------------------------------------------------------
drop policy if exists "Bestaetigungen: Workspace-Mitglieder koennen lesen" on public.todo_confirmations;
create policy "Bestaetigungen: Workspace-Mitglieder koennen lesen"
  on public.todo_confirmations for select to authenticated
  using (
    exists (
      select 1 from public.todos t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = todo_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Bestaetigungen: Workspace-Mitglieder koennen bestaetigen" on public.todo_confirmations;
create policy "Bestaetigungen: Workspace-Mitglieder koennen bestaetigen"
  on public.todo_confirmations for insert to authenticated
  with check (
    confirmed_by = auth.uid()
    and exists (
      select 1 from public.todos t
      join public.workspace_members wm on wm.workspace_id = t.workspace_id
      where t.id = todo_id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- POINTS
-- -------------------------------------------------------------------------
drop policy if exists "Punkte: Workspace-Mitglieder koennen lesen" on public.points;
create policy "Punkte: Workspace-Mitglieder koennen lesen"
  on public.points for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- STREAKS
-- -------------------------------------------------------------------------
drop policy if exists "Streaks: Workspace-Mitglieder koennen lesen" on public.streaks;
create policy "Streaks: Workspace-Mitglieder koennen lesen"
  on public.streaks for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- MONTHLY_GOALS
-- -------------------------------------------------------------------------
drop policy if exists "Monatsziele: eigene Ziele lesen" on public.monthly_goals;
create policy "Monatsziele: eigene Ziele lesen"
  on public.monthly_goals for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- WEEKLY_GOALS
-- -------------------------------------------------------------------------
drop policy if exists "Wochenziele: Workspace-Mitglieder koennen lesen" on public.weekly_goals;
create policy "Wochenziele: Workspace-Mitglieder koennen lesen"
  on public.weekly_goals for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------------------
-- NOTES
-- -------------------------------------------------------------------------
drop policy if exists "Notizen: Workspace-Mitglieder koennen lesen" on public.notes;
create policy "Notizen: Workspace-Mitglieder koennen lesen"
  on public.notes for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Notizen: Workspace-Mitglieder koennen erstellen" on public.notes;
create policy "Notizen: Workspace-Mitglieder koennen erstellen"
  on public.notes for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = workspace_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Notizen: Ersteller kann loeschen" on public.notes;
create policy "Notizen: Ersteller kann loeschen"
  on public.notes for delete to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- NOTE_REPLIES (joins through notes)
-- -------------------------------------------------------------------------
drop policy if exists "Antworten: Workspace-Mitglieder koennen lesen" on public.note_replies;
create policy "Antworten: Workspace-Mitglieder koennen lesen"
  on public.note_replies for select to authenticated
  using (
    exists (
      select 1 from public.notes n
      join public.workspace_members wm on wm.workspace_id = n.workspace_id
      where n.id = note_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Antworten: Workspace-Mitglieder koennen antworten" on public.note_replies;
create policy "Antworten: Workspace-Mitglieder koennen antworten"
  on public.note_replies for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.notes n
      join public.workspace_members wm on wm.workspace_id = n.workspace_id
      where n.id = note_id and wm.user_id = auth.uid()
    )
  );

drop policy if exists "Antworten: Ersteller kann loeschen" on public.note_replies;
create policy "Antworten: Ersteller kann loeschen"
  on public.note_replies for delete to authenticated
  using (user_id = auth.uid());
