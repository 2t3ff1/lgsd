import { NextRequest, NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/push";

/**
 * Interner Endpunkt, ueber den die Supabase Edge Function (daily-reminder)
 * Push-Benachrichtigungen auslösen kann, ohne selbst die Web-Push-Kryptographie
 * implementieren zu muessen (Deno-Runtime). Durch CRON_SECRET geschuetzt.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { userId, title, body: message, url } = body as {
    userId?: string;
    title?: string;
    body?: string;
    url?: string;
  };

  if (!userId || !title || !message) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  await sendPushToUser(userId, { title, body: message, url });
  return NextResponse.json({ success: true });
}
