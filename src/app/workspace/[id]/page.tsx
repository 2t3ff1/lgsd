import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { MemberTile } from "@/components/MemberTile";
import { Leaderboard } from "@/components/Leaderboard";
import { RealtimeRefresher } from "@/components/RealtimeRefresher";
import { NoteBoard } from "@/components/NoteBoard";
import { UserBackground } from "@/components/UserBackground";
import { WeekPreview, type HabitStatus } from "@/components/WeekPreview";
import { ChatBox } from "@/components/ChatBox";
import { Button } from "@/components/ui/Button";
import type {
  ChatMessage,
  Note,
  Profile,
  Streak,
  Todo,
  TodoConfirmation,
  TodoProof,
  TodoReaction,
  WeeklyGoal,
} from "@/types/database";

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: workspace }, { data: profile }, { data: members }] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, avatar_url, avatar_color, background_color, background_image_url")
      .eq("id", user.id)
      .single(),
    supabase.from("workspace_members").select("user_id, profiles(*)").eq("workspace_id", params.id),
  ]);

  if (!workspace) notFound();

  const profiles: Profile[] = (members ?? [])
    .map((m) => m.profiles as unknown as Profile)
    .filter(Boolean);

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const weekStartISO = monday.toISOString().slice(0, 10);

  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 6);
  const weekEndISO = weekEnd.toISOString().slice(0, 10);

  const [
    { data: todos },
    { data: streaks },
    { data: weeklyGoals },
    { data: allPoints },
  ] = await Promise.all([
    supabase
      .from("todos")
      .select("*")
      .eq("workspace_id", params.id)
      .gte("date", yesterdayISO)
      .lte("date", todayISO)
      .order("created_at", { ascending: true }),
    supabase.from("streaks").select("*").eq("workspace_id", params.id),
    supabase.from("weekly_goals").select("*").eq("workspace_id", params.id).eq("week_start", weekStartISO),
    supabase.from("points").select("user_id, amount").eq("workspace_id", params.id),
  ]);

  const { data: ownWeekTodos } = await supabase
    .from("todos")
    .select("*")
    .eq("workspace_id", params.id)
    .eq("user_id", user.id)
    .gte("date", todayISO)
    .lte("date", weekEndISO)
    .order("date", { ascending: true });

  const ownTodosByDate: Record<string, Todo[]> = {};
  const habitByDate: Record<string, HabitStatus> = {};
  (ownWeekTodos ?? []).forEach((t) => {
    const todo = t as Todo;
    const arr = ownTodosByDate[todo.date] ?? [];
    arr.push(todo);
    ownTodosByDate[todo.date] = arr;

    if (todo.is_recurring) {
      if (todo.status === "confirmed") habitByDate[todo.date] = "done";
      else if (todo.status === "missed" && habitByDate[todo.date] !== "done") habitByDate[todo.date] = "missed";
      else if (!habitByDate[todo.date]) habitByDate[todo.date] = "pending";
    }
  });

  const allTodos: Todo[] = todos ?? [];
  const todoIds = allTodos.map((t) => t.id);

  const { data: notesRaw } = await supabase
    .from("notes")
    .select("*, profiles(display_name, avatar_url), note_replies(*, profiles(display_name))")
    .eq("workspace_id", params.id)
    .order("created_at", { ascending: false });

  const notes: Note[] = (notesRaw ?? []) as unknown as Note[];

  const [{ data: chatRaw }, { data: presenceRaw }] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("*, profiles(display_name, avatar_url, avatar_color)")
      .eq("workspace_id", params.id)
      .order("created_at", { ascending: true })
      .limit(50),
    supabase.from("user_presence").select("user_id, last_seen").eq("workspace_id", params.id),
  ]);

  const chatMessages: ChatMessage[] = (chatRaw ?? []) as unknown as ChatMessage[];
  const presenceByUser: Record<string, string> = {};
  (presenceRaw ?? []).forEach((p) => {
    presenceByUser[p.user_id] = p.last_seen;
  });

  const [{ data: proofs }, { data: confirmations }, { data: reactionsRaw }] = await Promise.all([
    todoIds.length
      ? supabase.from("todo_proof").select("*").in("todo_id", todoIds)
      : Promise.resolve({ data: [] as TodoProof[] }),
    todoIds.length
      ? supabase
          .from("todo_confirmations")
          .select("*, profiles(display_name)")
          .in("todo_id", todoIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as (TodoConfirmation & { profiles: { display_name: string } | null })[] }),
    todoIds.length
      ? supabase.from("todo_reactions").select("*, profiles(display_name)").in("todo_id", todoIds)
      : Promise.resolve({ data: [] as TodoReaction[] }),
  ]);

  const proofsByTodo = new Map<string, TodoProof>();
  (proofs ?? []).forEach((p) => proofsByTodo.set(p.todo_id, p as TodoProof));

  const reactionsByTodo = new Map<string, TodoReaction[]>();
  (reactionsRaw ?? []).forEach((r) => {
    const reaction = r as TodoReaction;
    const list = reactionsByTodo.get(reaction.todo_id) ?? [];
    list.push(reaction);
    reactionsByTodo.set(reaction.todo_id, list);
  });

  const lastConfirmationByTodo = new Map<string, TodoConfirmation>();
  (confirmations ?? []).forEach((c) => {
    const { profiles, ...rest } = c as TodoConfirmation & { profiles: { display_name: string } | null };
    lastConfirmationByTodo.set(c.todo_id, { ...rest, confirmer_name: profiles?.display_name });
  });

  const streakByUser = new Map<string, Streak>();
  (streaks ?? []).forEach((s) => streakByUser.set(s.user_id, s as Streak));

  const weeklyGoalsByUser = new Map<string, WeeklyGoal[]>();
  (weeklyGoals ?? []).forEach((g) => {
    const list = weeklyGoalsByUser.get(g.user_id) ?? [];
    list.push(g as WeeklyGoal);
    weeklyGoalsByUser.set(g.user_id, list);
  });

  const pointsByUser = new Map<string, number>();
  (allPoints ?? []).forEach((p) => {
    pointsByUser.set(p.user_id, (pointsByUser.get(p.user_id) ?? 0) + p.amount);
  });

  // Sortierung: eigene Kachel zuerst
  const sortedProfiles = [...profiles].sort((a, b) => {
    if (a.id === user.id) return -1;
    if (b.id === user.id) return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  const isWorkspaceOwner = workspace.created_by === user.id;

  return (
    <div className="min-h-screen pb-12">
      <UserBackground color={profile?.background_color} imageUrl={profile?.background_image_url} />
      <RealtimeRefresher workspaceId={workspace.id} />
      <AppHeader
        displayName={profile?.display_name ?? "Du"}
        avatarUrl={profile?.avatar_url}
        avatarColor={profile?.avatar_color}
        backHref="/dashboard"
        backLabel="Workspaces"
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">{workspace.name}</h1>
            {workspace.description && <p className="mt-1 text-ink-light">{workspace.description}</p>}
          </div>
          <Link href={`/workspace/${workspace.id}/settings`}>
            <Button variant="outline" size="sm">
              ⚙️ Einstellungen
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-3">
            {sortedProfiles.map((p) => {
              const isOwn = p.id === user.id;
              const memberTodos = allTodos.filter((t) => {
                if (t.user_id !== p.id) return false;
                if (t.date === todayISO) return true;
                // Aufgaben von gestern, die noch bestaetigt werden koennen
                if (t.date === yesterdayISO && t.status !== "confirmed" && t.status !== "open") return true;
                return false;
              });

              return (
                <MemberTile
                  key={p.id}
                  profile={p}
                  isOwn={isOwn}
                  isWorkspaceOwner={isWorkspaceOwner}
                  workspaceId={workspace.id}
                  todos={memberTodos}
                  proofsByTodo={proofsByTodo}
                  lastConfirmationByTodo={lastConfirmationByTodo}
                  reactionsByTodo={reactionsByTodo}
                  currentUserId={user.id}
                  streak={streakByUser.get(p.id)?.current_streak ?? 0}
                  weeklyGoals={weeklyGoalsByUser.get(p.id) ?? []}
                  totalPoints={pointsByUser.get(p.id) ?? 0}
                  cardColor={isOwn ? p.card_color : null}
                />
              );
            })}
          </div>

          <div className="space-y-6 lg:col-span-1">
            <Leaderboard
              entries={sortedProfiles.map((p) => ({
                profile: p,
                points: pointsByUser.get(p.id) ?? 0,
                streak: streakByUser.get(p.id)?.current_streak ?? 0,
                isOwn: p.id === user.id,
              }))}
            />
            <ChatBox
              workspaceId={workspace.id}
              currentUserId={user.id}
              members={sortedProfiles}
              initialMessages={chatMessages}
              initialPresence={presenceByUser}
            />
          </div>
        </div>

        <WeekPreview
          todosByDate={ownTodosByDate}
          habitByDate={habitByDate}
          title="Mein Kalender in diesem Workspace"
        />

        <NoteBoard workspaceId={workspace.id} notes={notes} />
      </main>
    </div>
  );
}
