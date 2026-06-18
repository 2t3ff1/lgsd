import { Avatar } from "@/components/ui/Avatar";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { TodoItem } from "@/components/TodoItem";
import { AddTodoForm } from "@/components/AddTodoForm";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { cn } from "@/lib/utils";
import type { Profile, Todo, TodoConfirmation, TodoProof, WeeklyGoal } from "@/types/database";

export function MemberTile({
  profile,
  isOwn,
  isWorkspaceOwner,
  workspaceId,
  todos,
  proofsByTodo,
  lastConfirmationByTodo,
  streak,
  weeklyGoals,
  totalPoints,
}: {
  profile: Profile;
  isOwn: boolean;
  isWorkspaceOwner: boolean;
  workspaceId: string;
  todos: Todo[];
  proofsByTodo: Map<string, TodoProof>;
  lastConfirmationByTodo: Map<string, TodoConfirmation>;
  streak: number;
  weeklyGoals: WeeklyGoal[];
  totalPoints: number;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-4 rounded-2xl border-2 bg-surface p-4 shadow-soft",
        isOwn ? "border-primary-400 ring-2 ring-primary-100 dark:ring-primary-500/20" : "border-border-subtle"
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={profile.display_name} url={profile.avatar_url} />
        <div className="min-w-0">
          <p className="truncate font-bold">
            {profile.display_name} {isOwn && <span className="text-primary-500">(Du)</span>}
          </p>
          <div className="flex items-center gap-2 text-xs text-ink-light">
            <StreakBadge streak={streak} />
            <span>·</span>
            <span className="font-semibold text-primary-600">{totalPoints} Pkt.</span>
          </div>
        </div>
      </div>

      {isOwn && <WeeklyGoals workspaceId={workspaceId} goals={weeklyGoals} />}

      <div className="flex-1 max-h-[400px] space-y-2 overflow-y-auto pr-0.5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-light">
          {isOwn ? "Heute" : "Heute"}
        </p>
        {todos.length === 0 ? (
          <p className="rounded-xl bg-surface-muted px-3 py-4 text-center text-sm text-ink-light">
            Keine Aufgaben für heute 🎉
          </p>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              isOwn={isOwn}
              workspaceId={workspaceId}
              proof={proofsByTodo.get(todo.id)}
              lastConfirmation={lastConfirmationByTodo.get(todo.id)}
              canDelete={isOwn || isWorkspaceOwner}
            />
          ))
        )}
      </div>

      {isOwn && <AddTodoForm workspaceId={workspaceId} />}
    </div>
  );
}
