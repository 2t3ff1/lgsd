import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreateWorkspaceCard } from "@/components/CreateWorkspaceCard";
import { MonthlyGoalCelebration } from "@/components/MonthlyGoalCelebration";
import { WeekPreview } from "@/components/WeekPreview";
import type { MonthlyGoal, Streak, Todo, Workspace } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, membershipsResult] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).single(),
    supabase.from("workspace_members").select("workspace_id, workspaces(*)").eq("user_id", user.id),
  ]);

  // Zweite Query ohne Join zum Isolieren des Problems
  const { data: rawMembers, error: rawError } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id");

  const { data: allMembers, error: allError } = await supabase
    .from("workspace_members")
    .select("workspace_id, user_id")
    .eq("user_id", user.id);

  console.log("=== DASHBOARD DEBUG ===");
  console.log("user.id:", user.id);
  console.log("memberships WITH join:", JSON.stringify(membershipsResult.data), "| error:", membershipsResult.error?.message);
  console.log("workspace_members (all, no eq):", JSON.stringify(rawMembers), "| error:", rawError?.message);
  console.log("workspace_members (eq user_id):", JSON.stringify(allMembers), "| error:", allError?.message);
  console.log("======================");

  const { data: memberships } = membershipsResult;

  const workspaces: Workspace[] = (memberships ?? [])
    .map((m) => m.workspaces as unknown as Workspace)
    .filter(Boolean);

  const workspaceIds = workspaces.map((w) => w.id);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthISO = monthStart.toISOString().slice(0, 10);

  const todayISO = new Date().toISOString().slice(0, 10);
  const weekEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const weekEndISO = weekEndDate.toISOString().slice(0, 10);

  const [{ data: memberCounts }, { data: goals }, { data: streaks }, { data: monthPoints }, { data: upcomingTodos }] =
    await Promise.all([
      workspaceIds.length
        ? supabase.from("workspace_members").select("workspace_id, user_id").in("workspace_id", workspaceIds)
        : Promise.resolve({ data: [] as { workspace_id: string; user_id: string }[] }),
      workspaceIds.length
        ? supabase
            .from("monthly_goals")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", monthISO)
            .in("workspace_id", workspaceIds)
        : Promise.resolve({ data: [] as MonthlyGoal[] }),
      workspaceIds.length
        ? supabase.from("streaks").select("*").eq("user_id", user.id).in("workspace_id", workspaceIds)
        : Promise.resolve({ data: [] as Streak[] }),
      workspaceIds.length
        ? supabase
            .from("points")
            .select("workspace_id, amount")
            .eq("user_id", user.id)
            .gte("created_at", monthStart.toISOString())
        : Promise.resolve({ data: [] as { workspace_id: string; amount: number }[] }),
      supabase
        .from("todos")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", todayISO)
        .lte("date", weekEndISO)
        .order("date", { ascending: true }),
    ]);

  const memberCountByWorkspace = new Map<string, number>();
  (memberCounts ?? []).forEach((m) => {
    memberCountByWorkspace.set(m.workspace_id, (memberCountByWorkspace.get(m.workspace_id) ?? 0) + 1);
  });

  const goalByWorkspace = new Map<string, MonthlyGoal>();
  (goals ?? []).forEach((g) => goalByWorkspace.set(g.workspace_id, g as MonthlyGoal));

  const streakByWorkspace = new Map<string, Streak>();
  (streaks ?? []).forEach((s) => streakByWorkspace.set(s.workspace_id, s as Streak));

  const pointsByWorkspace = new Map<string, number>();
  (monthPoints ?? []).forEach((p) => {
    pointsByWorkspace.set(p.workspace_id, (pointsByWorkspace.get(p.workspace_id) ?? 0) + p.amount);
  });

  const todosByDate: Record<string, Todo[]> = {};
  (upcomingTodos ?? []).forEach((t) => {
    const arr = todosByDate[t.date] ?? [];
    arr.push(t as Todo);
    todosByDate[t.date] = arr;
  });

  const achievedGoal = (goals ?? []).find((g) => g.achieved) as MonthlyGoal | undefined;

  return (
    <div className="min-h-screen">
      <AppHeader displayName={profile?.display_name ?? "Du"} avatarUrl={profile?.avatar_url} />

      {achievedGoal && (
        <MonthlyGoalCelebration goalId={achievedGoal.id} rewardText={achievedGoal.reward_text} />
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Hey {profile?.display_name?.split(" ")[0] ?? ""} 👋
        </h1>
        <p className="mt-1 text-ink-light">Hier sind deine Workspaces und dein Fortschritt.</p>

        {workspaces.length === 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                icon="🏠"
                title="Du hast noch keine Workspaces"
                description="Erstell deinen ersten Workspace und lade Freunde ein, um gemeinsam dranzubleiben."
              />
            </div>
            <CreateWorkspaceCard />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => {
              const goal = goalByWorkspace.get(ws.id);
              const points = pointsByWorkspace.get(ws.id) ?? 0;
              const streak = streakByWorkspace.get(ws.id);

              return (
                <Link key={ws.id} href={`/workspace/${ws.id}`}>
                  <Card className="flex h-full flex-col gap-3 rounded-2xl transition-transform hover:-translate-y-1 hover:shadow-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold">{ws.name}</h3>
                        {ws.description && (
                          <p className="mt-0.5 line-clamp-2 text-sm text-ink-light">{ws.description}</p>
                        )}
                      </div>
                      <StreakBadge streak={streak?.current_streak ?? 0} />
                    </div>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <Badge tone="primary">
                          {memberCountByWorkspace.get(ws.id) ?? 1} Mitglied
                          {(memberCountByWorkspace.get(ws.id) ?? 1) === 1 ? "" : "er"}
                        </Badge>
                        <span className="font-bold text-primary-600">{points} Pkt. diesen Monat</span>
                      </div>

                      {goal ? (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-ink-light">
                            <span>Ziel: {goal.reward_text}</span>
                            <span>
                              {points} / {goal.target_points}
                            </span>
                          </div>
                          <ProgressBar value={points} max={goal.target_points} />
                        </div>
                      ) : (
                        <p className="text-xs text-ink-light">Noch kein Monatsziel gesetzt.</p>
                      )}
                    </div>
                  </Card>
                </Link>
              );
            })}
            <CreateWorkspaceCard />
          </div>
        )}

        <WeekPreview todosByDate={todosByDate} />
      </main>
    </div>
  );
}
