import { Avatar } from "@/components/ui/Avatar";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { TodoItem } from "@/components/TodoItem";
import { AddTodoForm } from "@/components/AddTodoForm";
import { WeeklyGoals } from "@/components/WeeklyGoals";
import { NudgeButton } from "@/components/NudgeButton";
import { cn } from "@/lib/utils";
import type { Profile, Subtask, Todo, TodoConfirmation, TodoProof, TodoReaction, WeeklyGoal } from "@/types/database";

export function MemberTile({
  profile,
  isOwn,
  isWorkspaceOwner,
  workspaceId,
  todos,
  proofsByTodo,
  lastConfirmationByTodo,
  reactionsByTodo,
  subtasksByTodo,
  currentUserId,
  streak,
  weeklyGoals,
  totalPoints,
  cardColor,
}: {
  profile: Profile;
  isOwn: boolean;
  isWorkspaceOwner: boolean;
  workspaceId: string;
  todos: Todo[];
  proofsByTodo: Map<string, TodoProof>;
  lastConfirmationByTodo: Map<string, TodoConfirmation>;
  reactionsByTodo?: Map<string, TodoReaction[]>;
  subtasksByTodo?: Map<string, Subtask[]>;
  currentUserId?: string;
  streak: number;
  weeklyGoals: WeeklyGoal[];
  totalPoints: number;
  cardColor?: string | null;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-surface p-5 shadow-soft",
        !cardColor && (isOwn
          ? "border-primary-400 ring-2 ring-primary-100 dark:ring-primary-500/20"
          : "border-border-subtle")
      )}
      style={cardColor ? { backgroundColor: cardColor, borderColor: cardColor } : undefined}
    >
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={profile.display_name} url={profile.avatar_url} color={profile.avatar_color} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">
            {profile.display_name} {isOwn && <span className="text-primary-500">(Du)</span>}
          </p>
          <div className="flex items-center gap-2 text-xs text-ink-light">
            <StreakBadge streak={streak} />
            <span>·</span>
            <span className="font-semibold text-primary-600">{totalPoints} Pkt.</span>
          </div>
        </div>
        {!isOwn && todos.some((t) => t.status === "open") && (
          <NudgeButton workspaceId={workspaceId} toUserId={profile.id} />
        )}
      </div>

      {isOwn && <WeeklyGoals workspaceId={workspaceId} goals={weeklyGoals} />}

      <div className="mt-4 max-h-[600px] space-y-3 overflow-y-auto pr-0.5 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0 lg:grid-cols-3">
        {todos.length === 0 ? (
          <p className="col-span-full rounded-xl bg-surface-muted px-3 py-4 text-center text-sm text-ink-light">
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
              reactions={reactionsByTodo?.get(todo.id) ?? []}
              subtasks={subtasksByTodo?.get(todo.id) ?? []}
              currentUserId={currentUserId}
              canDelete={isOwn || isWorkspaceOwner}
            />
          ))
        )}
      </div>

      {isOwn && (
        <div className="mt-3">
          <AddTodoForm workspaceId={workspaceId} />
        </div>
      )}
    </div>
  );
}
