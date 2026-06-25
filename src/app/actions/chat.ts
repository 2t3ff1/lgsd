"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendChatMessage(workspaceId: string, content: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const trimmed = content.trim();
  if (!trimmed) return { error: "Nachricht darf nicht leer sein." };

  const { error } = await supabase.from("chat_messages").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    content: trimmed,
  });

  if (error) return { error: "Nachricht konnte nicht gesendet werden." };

  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function touchPresence(workspaceId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.rpc("touch_presence", { _workspace_id: workspaceId });
}
