"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MemberTile } from "@/components/MemberTile";
import type { Profile, Subtask, Todo, TodoConfirmation, TodoProof, TodoReaction, WeeklyGoal } from "@/types/database";

type TileProps = {
  profile: Profile;
  isOwn: boolean;
  isWorkspaceOwner: boolean;
  workspaceId: string;
  todos: Todo[];
  proofsByTodo: Map<string, TodoProof>;
  lastConfirmationByTodo: Map<string, TodoConfirmation>;
  reactionsByTodo: Map<string, TodoReaction[]>;
  subtasksByTodo: Map<string, Subtask[]>;
  currentUserId: string;
  streak: number;
  weeklyGoals: WeeklyGoal[];
  totalPoints: number;
  cardColor: string | null | undefined;
};

function SortableTile({ id, tileProps }: { id: string; tileProps: TileProps }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* drag handle bar */}
      <div
        {...attributes}
        {...listeners}
        className="mb-1 flex cursor-grab items-center justify-center rounded-xl py-1 text-ink-light/40 hover:text-ink-light/70 active:cursor-grabbing"
        title="Kachel verschieben"
      >
        <svg width="20" height="8" viewBox="0 0 20 8" fill="currentColor">
          <circle cx="2" cy="2" r="1.5" />
          <circle cx="10" cy="2" r="1.5" />
          <circle cx="18" cy="2" r="1.5" />
          <circle cx="2" cy="6" r="1.5" />
          <circle cx="10" cy="6" r="1.5" />
          <circle cx="18" cy="6" r="1.5" />
        </svg>
      </div>
      <MemberTile {...tileProps} />
    </div>
  );
}

export function SortableMemberGrid({
  tiles,
  storageKey,
}: {
  tiles: TileProps[];
  storageKey: string;
}) {
  const [order, setOrder] = useState<string[]>(() => tiles.map((t) => t.profile.id));

  // Load saved order from localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const savedOrder: string[] = JSON.parse(saved);
        const currentIds = new Set(tiles.map((t) => t.profile.id));
        // Keep only ids still in the workspace, preserve saved order, append new ones
        const valid = savedOrder.filter((id) => currentIds.has(id));
        const missing = tiles.map((t) => t.profile.id).filter((id) => !valid.includes(id));
        setOrder([...valid, ...missing]);
      }
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      const next = arrayMove(prev, oldIndex, newIndex);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const tileMap = new Map(tiles.map((t) => [t.profile.id, t]));
  const sorted = order.map((id) => tileMap.get(id)).filter(Boolean) as TileProps[];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <div className="space-y-4">
          {sorted.map((t) => (
            <SortableTile key={t.profile.id} id={t.profile.id} tileProps={t} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
