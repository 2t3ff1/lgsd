import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push";

/** Schickt eine Test-Push an den eingeloggten Nutzer. */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID-Keys nicht konfiguriert (Vercel Env Vars fehlen)" }, { status: 500 });
  }

  await sendPushToUser(user.id, {
    title: "🔔 Test-Benachrichtigung",
    body: "Push funktioniert! 🎉",
    url: "/dashboard",
  });

  return NextResponse.json({ success: true });
}
