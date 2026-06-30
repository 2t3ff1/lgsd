"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { POINT_OPTIONS, type RecurrenceType } from "@/types/database";
import { sendPushToUser } from "@/lib/push";

const STREAK_MILESTONES = [7, 14, 30, 60, 100];

export async function createTodo(workspaceId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const isDeadlineTask = formData.get("is_deadline_task") === "on";
  const startDate = String(formData.get("start_date") ?? "").trim() || null;
  const deadlineDate = String(formData.get("deadline_date") ?? "").trim() || null;
  const date = isDeadlineTask ? deadlineDate ?? "" : String(formData.get("date") ?? "");
  const isRecurring = !isDeadlineTask && formData.get("is_recurring") === "on";
  const recurrenceType = String(formData.get("recurrence_type") ?? "");
  const suggestedPoints = Number(formData.get("suggested_points") ?? 5);
  const scheduledTime = String(formData.get("scheduled_time") ?? "").trim() || null;
  const recurrenceIntervalRaw = String(formData.get("recurrence_interval") ?? "").trim();
  const recurrenceInterval =
    isRecurring && recurrenceType === "interval" && recurrenceIntervalRaw
      ? Math.max(1, Number(recurrenceIntervalRaw))
      : null;
  const recurrenceDays = isRecurring && recurrenceType === "weekdays"
    ? formData.getAll("recurrence_days").map((d) => Number(d))
    : null;

  if (!title) {
    return { error: "Bitte einen Titel angeben." };
  }

  if (isDeadlineTask) {
    if (!startDate || !deadlineDate) {
      return { error: "Bitte Start-Datum und Frist-Datum angeben." };
    }
    if (startDate > deadlineDate) {
      return { error: "Das Frist-Datum muss nach dem Start-Datum liegen." };
    }
  } else if (!date) {
    return { error: "Bitte ein Datum angeben." };
  }

  if (!POINT_OPTIONS.includes(suggestedPoints as (typeof POINT_OPTIONS)[number])) {
    return { error: "Ungültiger Punktevorschlag." };
  }

  if (isRecurring && recurrenceType === "interval" && !recurrenceInterval) {
    return { error: "Bitte gib an, alle wie viele Tage die Aufgabe wiederholt werden soll." };
  }

  if (isRecurring && recurrenceType === "weekdays" && (!recurrenceDays || recurrenceDays.length === 0)) {
    return { error: "Bitte waehle mindestens einen Wochentag aus." };
  }

  // "interval" und "weekdays" sind keine echten recurrence_type-Werte in der DB,
  // sondern steuern recurrence_interval / recurrence_days. Fuer die DB-Spalte
  // recurrence_type wird in diesen Faellen kein Basistyp gesetzt.
  const dbRecurrenceType =
    isRecurring && recurrenceType && recurrenceType !== "interval" && recurrenceType !== "weekdays"
      ? (recurrenceType as RecurrenceType)
      : null;

  const { error } = await supabase.from("todos").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    title,
    date,
    is_recurring: isRecurring,
    recurrence_type: dbRecurrenceType,
    recurrence_interval: recurrenceInterval,
    recurrence_days: recurrenceDays,
    suggested_points: suggestedPoints,
    scheduled_time: scheduledTime,
    is_deadline_task: isDeadlineTask,
    start_date: isDeadlineTask ? startDate : null,
    deadline_date: isDeadlineTask ? deadlineDate : null,
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

export async function confirmTodo(
  workspaceId: string,
  todoId: string,
  points: number,
  comment?: string
) {
  if (!POINT_OPTIONS.includes(points as (typeof POINT_OPTIONS)[number])) {
    return { error: "Ungültige Punktzahl." };
  }

  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_todo", {
    _todo_id: todoId,
    _comment: comment ?? null,
    _points: points,
  });

  if (error) {
    return { error: "Aufgabe konnte nicht bestaetigt werden." };
  }

  const { data: todo } = await supabase
    .from("todos")
    .select("user_id, title")
    .eq("id", todoId)
    .single();

  if (todo) {
    await sendPushToUser(todo.user_id, {
      title: "✅ Aufgabe bestätigt",
      body: `„${todo.title}“ wurde bestätigt (+${points} Punkte).`,
      url: `/workspace/${workspaceId}`,
    });

    const { data: streak } = await supabase
      .from("streaks")
      .select("current_streak")
      .eq("user_id", todo.user_id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (streak && STREAK_MILESTONES.includes(streak.current_streak)) {
      await sendPushToUser(todo.user_id, {
        title: "🔥 Streak-Meilenstein!",
        body: `${streak.current_streak} Tage in Folge durchgezogen!`,
        url: `/workspace/${workspaceId}`,
      });
    }
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

  const { data: todo } = await supabase
    .from("todos")
    .select("is_deadline_task")
    .eq("id", todoId)
    .single();

  if (todo?.is_deadline_task) {
    return { error: "Fristaufgaben koennen nicht verschoben werden." };
  }

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

  const { data: todo } = await supabase
    .from("todos")
    .select("user_id, title")
    .eq("id", todoId)
    .single();

  if (todo) {
    await sendPushToUser(todo.user_id, {
      title: "❌ Beweis angefordert",
      body: `Für „${todo.title}“ wurde ein Beweis angefordert.`,
      url: `/workspace/${workspaceId}`,
    });
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
