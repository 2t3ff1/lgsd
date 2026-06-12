import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Session-Cookie wird mit langer Lebensdauer gespeichert, damit Nutzer
// auch nach dem Schliessen des Browsers angemeldet bleiben.
const ONE_YEAR = 60 * 60 * 24 * 365;

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        maxAge: ONE_YEAR,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Wird in Server Components aufgerufen, in denen das Setzen von
            // Cookies nicht moeglich ist. Middleware kuemmert sich darum.
          }
        },
      },
    }
  );
}
