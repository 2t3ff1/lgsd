"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendNudge(workspaceId: string, toUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("nudges").insert({
    workspace_id: workspaceId,
    from_user_id: user.id,
    to_user_id: toUserId,
  });

  if (error) {
    return { error: "Du hast diese Person heute schon angestupst." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function markNudgesSeen(nudgeIds: string[]) {
  if (nudgeIds.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("nudges").update({ seen: true }).in("id", nudgeIds).eq("to_user_id", user.id);
}
