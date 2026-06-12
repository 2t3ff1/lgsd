import { createBrowserClient } from "@supabase/ssr";

// Session-Cookie wird mit langer Lebensdauer gespeichert, damit Nutzer
// auch nach dem Schliessen des Browsers angemeldet bleiben.
const ONE_YEAR = 60 * 60 * 24 * 365;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: ONE_YEAR,
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
}
