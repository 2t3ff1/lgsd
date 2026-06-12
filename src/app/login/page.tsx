"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-Mail oder Passwort ist falsch.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleResetSubmit(e: FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      setResetError("Es ist ein Fehler aufgetreten. Bitte versuche es erneut.");
      setResetLoading(false);
      return;
    }

    setResetSent(true);
    setResetLoading(false);
  }

  if (showForgot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
        <Link href="/" className="mb-8">
          <Logo className="text-xl" />
        </Link>
        <Card className="w-full max-w-sm rounded-3xl">
          <h1 className="mb-1 text-2xl font-extrabold">Passwort vergessen?</h1>
          <p className="mb-6 text-sm text-ink-light">
            Gib deine E-Mail-Adresse ein und wir schicken dir einen Link zum Zurücksetzen.
          </p>

          {resetSent ? (
            <p className="rounded-xl bg-success-100 px-3 py-2 text-sm font-medium text-success-700 dark:bg-success-500/20 dark:text-success-400">
              Falls ein Konto mit dieser E-Mail existiert, haben wir dir einen Link zum
              Zurücksetzen des Passworts geschickt. Bitte prüfe dein Postfach.
            </p>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">E-Mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="du@beispiel.de"
                />
              </div>

              {resetError && (
                <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm font-medium text-danger-600 dark:bg-danger-500/20 dark:text-danger-400">
                  {resetError}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Senden …" : "Link senden"}
              </Button>
            </form>
          )}

          <button
            type="button"
            onClick={() => {
              setShowForgot(false);
              setResetSent(false);
              setResetError(null);
            }}
            className="mt-6 w-full text-center text-sm font-semibold text-primary-600 hover:underline"
          >
            ← Zurück zum Login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <Link href="/" className="mb-8">
        <Logo className="text-xl" />
      </Link>
      <Card className="w-full max-w-sm rounded-3xl">
        <h1 className="mb-1 text-2xl font-extrabold">Willkommen zurück</h1>
        <p className="mb-6 text-sm text-ink-light">Melde dich an und leg direkt los.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Passwort</Label>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="mb-1.5 text-xs font-semibold text-primary-600 hover:underline"
              >
                Passwort vergessen?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-danger-100 px-3 py-2 text-sm font-medium text-danger-600 dark:bg-danger-500/20 dark:text-danger-400">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Anmelden …" : "Anmelden"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-light">
          Noch keinen Account?{" "}
          <Link href="/register" className="font-semibold text-primary-600 hover:underline">
            Jetzt registrieren
          </Link>
        </p>
      </Card>
    </div>
  );
}
