import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProfileForm } from "@/components/ProfileForm";
import { MonthlyGoalForm } from "@/components/MonthlyGoalForm";
import { formatDate } from "@/lib/utils";
import type { MonthlyGoal, PointEntry, Workspace } from "@/types/database";

const reasonLabels: Record<string, { label: string; emoji: string }> = {
  todo_confirmed: { label: "Aufgabe bestätigt", emoji: "✅" },
  streak_bonus: { label: "Streak-Bonus", emoji: "🔥" },
  penalty_missed: { label: "Aufgabe verpasst", emoji: "💤" },
  penalty_reversed: { label: "Strafe rückgängig gemacht", emoji: "↩️" },
};

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) redirect("/login");

  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("workspace_members").select("workspace_id, workspaces(*)").eq("user_id", user.id),
  ]);

  const workspaces: Workspace[] = (memberships ?? [])
    .map((m) => m.workspaces as unknown as Workspace)
    .filter(Boolean);
  const workspaceIds = workspaces.map((w) => w.id);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthISO = monthStart.toISOString().slice(0, 10);

  const [{ data: goals }, { data: monthPoints }, { data: history }] = await Promise.all([
    workspaceIds.length
      ? supabase
          .from("monthly_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("month", monthISO)
          .in("workspace_id", workspaceIds)
      : Promise.resolve({ data: [] as MonthlyGoal[] }),
    workspaceIds.length
      ? supabase
          .from("points")
          .select("workspace_id, amount")
          .eq("user_id", user.id)
          .gte("created_at", monthStart.toISOString())
      : Promise.resolve({ data: [] as { workspace_id: string; amount: number }[] }),
    supabase
      .from("points")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const goalByWorkspace = new Map<string, MonthlyGoal>();
  (goals ?? []).forEach((g) => goalByWorkspace.set(g.workspace_id, g as MonthlyGoal));

  const pointsByWorkspace = new Map<string, number>();
  (monthPoints ?? []).forEach((p) => {
    pointsByWorkspace.set(p.workspace_id, (pointsByWorkspace.get(p.workspace_id) ?? 0) + p.amount);
  });

  const workspaceById = new Map(workspaces.map((w) => [w.id, w]));

  return (
    <div className="min-h-screen pb-12">
      <AppHeader displayName={profile?.display_name ?? "Du"} avatarUrl={profile?.avatar_url} />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Mein Profil</h1>

        <Card className="rounded-2xl">
          <div className="mb-4 flex items-center gap-4">
            <Avatar name={profile?.display_name ?? "?"} url={profile?.avatar_url} size="lg" />
            <div>
              <p className="text-lg font-bold">{profile?.display_name}</p>
              <p className="text-sm text-ink-light">{user.email}</p>
            </div>
          </div>
          <ProfileForm displayName={profile?.display_name ?? ""} />
        </Card>

        <Card className="rounded-2xl">
          <h2 className="mb-1 font-bold">Monatsziele</h2>
          <p className="mb-3 text-sm text-ink-light">
            Setz dir pro Workspace ein Ziel für diesen Monat — bei Erreichen gibt&apos;s Konfetti 🎉
          </p>
          {workspaces.length === 0 ? (
            <p className="text-sm text-ink-light">Tritt zuerst einem Workspace bei.</p>
          ) : (
            <div className="space-y-3">
              {workspaces.map((ws) => (
                <MonthlyGoalForm
                  key={ws.id}
                  workspace={ws}
                  goal={goalByWorkspace.get(ws.id)}
                  currentPoints={pointsByWorkspace.get(ws.id) ?? 0}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="rounded-2xl">
          <h2 className="mb-3 font-bold">Punktehistorie</h2>
          {(history ?? []).length === 0 ? (
            <p className="text-sm text-ink-light">Noch keine Punkte gesammelt.</p>
          ) : (
            <ul className="space-y-1.5">
              {(history as PointEntry[]).map((p) => {
                const meta = reasonLabels[p.reason] ?? { label: p.reason, emoji: "•" };
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{meta.emoji}</span>
                      <span className="font-medium">{meta.label}</span>
                      <Badge tone="neutral">{workspaceById.get(p.workspace_id)?.name ?? "Workspace"}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ink-light">{formatDate(p.created_at)}</span>
                      <span
                        className={`font-bold ${p.amount >= 0 ? "text-success-600" : "text-danger-600"}`}
                      >
                        {p.amount > 0 ? `+${p.amount}` : p.amount}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
