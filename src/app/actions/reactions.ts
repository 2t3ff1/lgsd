"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function toggleReaction(workspaceId: string, todoId: string, emoji: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("todo_reactions")
    .select("id")
    .eq("todo_id", todoId)
    .eq("user_id", user.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("todo_reactions").delete().eq("id", existing.id);
    if (error) return { error: "Reaktion konnte nicht entfernt werden." };
  } else {
    const { error } = await supabase
      .from("todo_reactions")
      .insert({ todo_id: todoId, user_id: user.id, emoji });
    if (error) return { error: "Reaktion konnte nicht gespeichert werden." };
  }

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}
