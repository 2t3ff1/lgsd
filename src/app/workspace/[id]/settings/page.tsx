import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InviteMemberForm } from "@/components/InviteMemberForm";
import { WorkspaceSettingsForm } from "@/components/WorkspaceSettingsForm";
import { cancelInvite, leaveWorkspace, removeMember } from "@/app/actions/workspaces";
import { DeleteWorkspaceButton } from "@/components/DeleteWorkspaceButton";
import type { Profile } from "@/types/database";

export default async function WorkspaceSettingsPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  const [{ data: workspace }, { data: profile }, { data: members }, { data: invites }] =
    await Promise.all([
      supabase.from("workspaces").select("*").eq("id", params.id).maybeSingle(),
      supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
      supabase
        .from("workspace_members")
        .select("user_id, joined_at, profiles(*)")
        .eq("workspace_id", params.id)
        .order("joined_at", { ascending: true }),
      supabase
        .from("workspace_invites")
        .select("*")
        .eq("workspace_id", params.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);

  if (!workspace) notFound();

  const isOwner = workspace.created_by === user.id;

  return (
    <div className="min-h-screen pb-12">
      <AppHeader
        displayName={profile?.display_name ?? "Du"}
        avatarUrl={profile?.avatar_url}
        backHref={`/workspace/${workspace.id}`}
        backLabel="Workspace"
      />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Workspace-Einstellungen</h1>

        {isOwner && (
          <Card className="rounded-2xl">
            <h2 className="mb-3 font-bold">Allgemein</h2>
            <WorkspaceSettingsForm workspace={workspace} />
          </Card>
        )}

        <Card className="rounded-2xl">
          <h2 className="mb-3 font-bold">Mitglieder</h2>
          <ul className="space-y-2">
            {(members ?? []).map((m) => {
              const p = m.profiles as unknown as Profile;
              if (!p) return null;
              return (
                <li key={m.user_id} className="flex items-center gap-3 rounded-xl bg-surface-muted p-2.5">
                  <Avatar name={p.display_name} url={p.avatar_url} size="sm" />
                  <span className="flex-1 truncate font-semibold">
                    {p.display_name}
                    {p.id === user.id && <span className="text-primary-500"> (Du)</span>}
                    {p.id === workspace.created_by && (
                      <Badge tone="primary" className="ml-2">
                        Owner
                      </Badge>
                    )}
                  </span>
                  {isOwner && p.id !== user.id && (
                    <form action={removeMember.bind(null, workspace.id, p.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-danger-500">
                        Entfernen
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="rounded-2xl">
          <h2 className="mb-3 font-bold">Mitglieder einladen</h2>
          <InviteMemberForm workspaceId={workspace.id} />

          {(invites ?? []).length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-light">
                Offene Einladungen
              </p>
              <ul className="space-y-1.5">
                {(invites ?? []).map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span>{inv.invited_email}</span>
                    <form action={cancelInvite.bind(null, workspace.id, inv.id)}>
                      <Button type="submit" size="sm" variant="ghost" className="text-danger-500">
                        Zurückziehen
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {!isOwner && (
          <Card className="rounded-2xl border-danger-200">
            <h2 className="mb-2 font-bold text-danger-600">Workspace verlassen</h2>
            <p className="mb-3 text-sm text-ink-light">
              Du verlierst den Zugriff auf diesen Workspace und alle zugehörigen Aufgaben.
            </p>
            <form action={leaveWorkspace.bind(null, workspace.id)}>
              <Button type="submit" variant="danger">
                Workspace verlassen
              </Button>
            </form>
          </Card>
        )}

        {isOwner && (
          <Card className="rounded-2xl border-danger-200">
            <h2 className="mb-2 font-bold text-danger-600">Workspace löschen</h2>
            <p className="mb-3 text-sm text-ink-light">
              Der Workspace und alle zugehörigen Aufgaben, Punkte und Daten werden unwiderruflich
              gelöscht.
            </p>
            <DeleteWorkspaceButton workspaceId={workspace.id} />
          </Card>
        )}
      </main>
    </div>
  );
}
