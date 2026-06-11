-- Fix: createWorkspace() inserts a workspace and immediately selects it back
-- (insert().select().single()), but at that point the creator is not yet a
-- workspace_members row, so the old SELECT policy (is_workspace_member only)
-- caused the select-after-insert to return no rows -> "Workspace konnte
-- nicht erstellt werden."
drop policy if exists "Workspaces: Mitglieder koennen lesen" on public.workspaces;

create policy "Workspaces: Mitglieder koennen lesen"
  on public.workspaces for select
  to authenticated
  using (created_by = auth.uid() or public.is_workspace_member(id, auth.uid()));
