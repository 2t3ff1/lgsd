"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setMonthlyGoal(workspaceId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const targetPoints = Number(formData.get("target_points"));
  const rewardText = String(formData.get("reward_text") ?? "").trim();

  if (!targetPoints || targetPoints <= 0 || !rewardText) {
    return { error: "Bitte Zielpunktzahl und Belohnung angeben." };
  }

  const month = new Date();
  month.setDate(1);
  const monthISO = month.toISOString().slice(0, 10);

  const { error } = await supabase.from("monthly_goals").upsert(
    {
      user_id: user.id,
      workspace_id: workspaceId,
      month: monthISO,
      target_points: targetPoints,
      reward_text: rewardText,
    },
    { onConflict: "user_id,workspace_id,month" }
  );

  if (error) {
    return { error: "Ziel konnte nicht gespeichert werden." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function setWeeklyGoal(workspaceId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Bitte ein Ziel angeben." };

  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const weekStart = monday.toISOString().slice(0, 10);

  const { error } = await supabase.from("weekly_goals").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    week_start: weekStart,
    title,
  });

  if (error) {
    return { error: "Ziel konnte nicht gespeichert werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  revalidatePath("/profile");
  return { success: true };
}

export async function deleteWeeklyGoal(workspaceId: string, goalId: string) {
  const supabase = createClient();
  await supabase.from("weekly_goals").delete().eq("id", goalId);
  revalidatePath(`/workspace/${workspaceId}`);
  revalidatePath("/profile");
}

export async function updateGoalProgress(workspaceId: string, goalId: string, progress: number) {
  const supabase = createClient();
  const { error } = await supabase
    .from("weekly_goals")
    .update({ progress: Math.max(0, Math.min(100, progress)) })
    .eq("id", goalId);
  if (error) return { error: "Fortschritt konnte nicht gespeichert werden." };
  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function completeWeeklyGoal(workspaceId: string, goalId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goal } = await supabase
    .from("weekly_goals")
    .select("title, completed")
    .eq("id", goalId)
    .single();

  if (!goal || goal.completed) return { error: "Bereits abgeschlossen." };

  await supabase.from("weekly_goals").update({ completed: true, progress: 100 }).eq("id", goalId);

  await supabase.from("points").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    amount: 20,
    reason: `Wochenziel erreicht: ${goal.title}`,
  });

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
