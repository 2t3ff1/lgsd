"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setWeeklyCommitment(workspaceId: string, weekStart: string, content: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = content.trim();
  if (!trimmed) return { error: "Bitte gib dein Commitment fuer diese Woche an." };

  const { error } = await supabase.from("weekly_commitments").upsert(
    {
      user_id: user.id,
      workspace_id: workspaceId,
      week_start: weekStart,
      content: trimmed,
    },
    { onConflict: "user_id,workspace_id,week_start" }
  );

  if (error) return { error: "Commitment konnte nicht gespeichert werden." };

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
