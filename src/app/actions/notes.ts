"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NOTE_COLORS = ["yellow", "green", "blue", "pink", "purple", "orange", "sky"];

export async function createNote(workspaceId: string, content: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];

  const { error } = await supabase.from("notes").insert({
    workspace_id: workspaceId,
    user_id: user.id,
    content,
    color,
  });

  if (error) return { error: "Zettel konnte nicht erstellt werden." };
  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function deleteNote(workspaceId: string, noteId: string) {
  const supabase = createClient();
  await supabase.from("notes").delete().eq("id", noteId);
  revalidatePath(`/workspace/${workspaceId}`);
}

export async function createNoteReply(workspaceId: string, noteId: string, content: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("note_replies").insert({
    note_id: noteId,
    user_id: user.id,
    content,
  });

  if (error) return { error: "Antwort konnte nicht gespeichert werden." };
  revalidatePath(`/workspace/${workspaceId}`);
  return { success: true };
}

export async function deleteNoteReply(workspaceId: string, replyId: string) {
  const supabase = createClient();
  await supabase.from("note_replies").delete().eq("id", replyId);
  revalidatePath(`/workspace/${workspaceId}`);
}
