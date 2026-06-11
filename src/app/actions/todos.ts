"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { RecurrenceType } from "@/types/database";

export async function createTodo(workspaceId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  const isRecurring = formData.get("is_recurring") === "on";
  const recurrenceType = String(formData.get("recurrence_type") ?? "") as RecurrenceType | "";

  if (!title || !date) {
    return { error: "Bitte Titel und Datum angeben." };
  }

  const { error } = await supabase.from("todos").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    title,
    date,
    is_recurring: isRecurring,
    recurrence_type: isRecurring && recurrenceType ? recurrenceType : null,
  });

  if (error) {
    return { error: "Aufgabe konnte nicht erstellt werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function deleteTodo(workspaceId: string, todoId: string) {
  const supabase = createClient();
  await supabase.from("todos").delete().eq("id", todoId);
  revalidatePath(`/workspace/${workspaceId}`);
}

export async function markTodoDone(workspaceId: string, todoId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_todo_done", { _todo_id: todoId });

  if (error) {
    return { error: "Konnte Aufgabe nicht als erledigt markieren." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function uploadProof(workspaceId: string, todoId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { error: "Bitte eine Datei auswaehlen." };
  }

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${todoId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("todo-proofs").upload(path, file, {
    upsert: true,
  });

  if (uploadError) {
    return { error: "Datei konnte nicht hochgeladen werden." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("todo-proofs").getPublicUrl(path);

  const { error: insertError } = await supabase.from("todo_proof").insert({
    todo_id: todoId,
    file_url: publicUrl,
  });

  if (insertError) {
    return { error: "Beweis konnte nicht gespeichert werden." };
  }

  // Falls der Beweis nach einer Anforderung hochgeladen wird, Status zurueck auf "pending"
  await supabase
    .from("todos")
    .update({ status: "pending" })
    .eq("id", todoId)
    .eq("status", "rejected");

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function confirmTodo(workspaceId: string, todoId: string, comment?: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_todo", {
    _todo_id: todoId,
    _comment: comment ?? null,
  });

  if (error) {
    return { error: "Aufgabe konnte nicht bestaetigt werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function requestShift(
  workspaceId: string,
  todoId: string,
  newDate: string,
  reason: string
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("request_todo_shift", {
    _todo_id: todoId,
    _new_date: newDate,
    _reason: reason,
  });

  if (error) {
    return { error: "Verschiebungsantrag konnte nicht gestellt werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function resolveShift(
  workspaceId: string,
  todoId: string,
  decision: "approve_no_penalty" | "approve_with_penalty" | "reject"
) {
  const supabase = createClient();
  const { error } = await supabase.rpc("resolve_todo_shift", {
    _todo_id: todoId,
    _decision: decision,
  });

  if (error) {
    return { error: "Verschiebungsantrag konnte nicht bearbeitet werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function requestProof(workspaceId: string, todoId: string, comment: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("request_todo_proof", {
    _todo_id: todoId,
    _comment: comment || "Ich glaube dir das nicht, schick Beweis",
  });

  if (error) {
    return { error: "Anfrage konnte nicht gesendet werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
