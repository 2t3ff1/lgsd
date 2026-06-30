"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POINT_OPTIONS } from "@/types/database";
import { sendPushToUser } from "@/lib/push";

export async function markSubtaskDone(workspaceId: string, subtaskId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_subtask_done", { _subtask_id: subtaskId });

  if (error) {
    return { error: "Unteraufgabe konnte nicht als erledigt markiert werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function confirmSubtask(workspaceId: string, subtaskId: string, points: number) {
  if (!POINT_OPTIONS.includes(points as (typeof POINT_OPTIONS)[number])) {
    return { error: "Ungültige Punktzahl." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_subtask", {
    _subtask_id: subtaskId,
    _points: points,
  });

  if (error) {
    return { error: "Unteraufgabe konnte nicht bestaetigt werden." };
  }

  const { data: subtask } = await supabase
    .from("subtasks")
    .select("parent_todo_id, title")
    .eq("id", subtaskId)
    .single();

  if (subtask) {
    const { data: todo } = await supabase
      .from("todos")
      .select("user_id")
      .eq("id", subtask.parent_todo_id)
      .single();

    if (todo) {
      await sendPushToUser(todo.user_id, {
        title: "✅ Unteraufgabe bestätigt",
        body: `„${subtask.title}“ wurde bestätigt (+${points} Punkte).`,
        url: `/workspace/${workspaceId}`,
      });
    }
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function createSubtask(workspaceId: string, parentTodoId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const suggestedPoints = Number(formData.get("suggested_points") ?? 5);

  if (!title) return { error: "Bitte einen Titel angeben." };
  if (!POINT_OPTIONS.includes(suggestedPoints as (typeof POINT_OPTIONS)[number])) {
    return { error: "Ungültiger Punktevorschlag." };
  }

  const { error } = await supabase.from("subtasks").insert({
    parent_todo_id: parentTodoId,
    title,
    suggested_points: suggestedPoints,
  });

  if (error) return { error: "Unteraufgabe konnte nicht erstellt werden." };

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function deleteSubtask(workspaceId: string, subtaskId: string) {
  const supabase = createClient();
  await supabase.from("subtasks").delete().eq("id", subtaskId).eq("status", "open");
  revalidatePath(`/workspace/${workspaceId}`);
}
