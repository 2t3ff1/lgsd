"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getTodosForMonth(workspaceId: string, year: number, month: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("todos")
    .select("id, title, date, status, is_recurring")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .gte("date", firstDay)
    .lte("date", lastDay)
    .order("date", { ascending: true });

  return { todos: data ?? [] };
}
