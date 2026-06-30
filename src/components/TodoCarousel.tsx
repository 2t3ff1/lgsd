"use client";

import { useMemo, useState } from "react";
import { TodoItem } from "@/components/TodoItem";
import type { Subtask, Todo, TodoConfirmation, TodoProof, TodoReaction } from "@/types/database";

const PAGE_SIZE = 3;

const OPEN_RANK: Record<string, number> = {
  open: 0,
  pending: 0,
  rejected: 0,
  missed: 0,
  confirmed: 1,
};

export function TodoCarousel({
  todos,
  workspaceId,
  isOwn,
  canDelete,
  proofsByTodo,
  lastConfirmationByTodo,
  reactionsByTodo,
  subtasksByTodo,
  currentUserId,
}: {
  todos: Todo[];
  workspaceId: string;
  isOwn: boolean;
  canDelete?: boolean;
  proofsByTodo: Map<string, TodoProof>;
  lastConfirmationByTodo: Map<string, TodoConfirmation>;
  reactionsByTodo?: Map<string, TodoReaction[]>;
  subtasksByTodo?: Map<string, Subtask[]>;
  currentUserId?: string;
}) {
  const [page, setPage] = useState(0);

  const sortedTodos = useMemo(() => {
    return [...todos].sort((a, b) => (OPEN_RANK[a.status] ?? 0) - (OPEN_RANK[b.status] ?? 0));
  }, [todos]);

  const pageCount = Math.max(1, Math.ceil(sortedTodos.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleTodos = sortedTodos.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

  if (todos.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl bg-surface-muted px-3 text-center text-sm text-ink-light">
        Keine Aufgaben für heute 🎉
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-[420px] gap-3">
        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTodos.map((todo) => (
            <div key={todo.id} className="overflow-y-auto pr-0.5">
              <TodoItem
                todo={todo}
                isOwn={isOwn}
                workspaceId={workspaceId}
                proof={proofsByTodo.get(todo.id)}
                lastConfirmation={lastConfirmationByTodo.get(todo.id)}
                reactions={reactionsByTodo?.get(todo.id) ?? []}
                subtasks={subtasksByTodo?.get(todo.id) ?? []}
                currentUserId={currentUserId}
                canDelete={canDelete}
              />
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="rounded-full border-2 border-border-subtle px-3 py-1 text-sm font-bold transition-colors hover:bg-surface-muted disabled:opacity-30"
            aria-label="Vorherige Aufgaben"
          >
            ←
          </button>
          <span className="text-xs font-medium text-ink-light">
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            className="rounded-full border-2 border-border-subtle px-3 py-1 text-sm font-bold transition-colors hover:bg-surface-muted disabled:opacity-30"
            aria-label="Weitere Aufgaben"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
