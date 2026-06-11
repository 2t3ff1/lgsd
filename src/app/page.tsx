import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { Card } from "@/components/ui/Card";

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo className="text-xl" />
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Registrieren</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="relative grid grid-cols-1 items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div className="relative z-10">
            <span className="inline-block rounded-full bg-accent-100 px-4 py-1.5 text-sm font-bold text-accent-600">
              Schluss mit leeren Versprechen 💪
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-ink sm:text-5xl md:text-6xl">
              Let&apos;s Get
              <br />
              <span className="text-primary-500">Shit Done.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-light">
              Trag deine täglichen Aufgaben ein, lass sie von deinen Freunden bestätigen
              und sammle Punkte für deine Streaks. Gemeinsam bleibt man dran.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Kostenlos starten</Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Ich habe schon einen Account
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative z-10 hidden md:block">
            <div className="absolute -top-10 -right-6 h-40 w-40 rounded-full bg-accent-100 blur-2xl" />
            <div className="absolute -bottom-10 left-10 h-48 w-48 rounded-full bg-primary-100 blur-2xl" />
            <Card className="relative animate-pop-in space-y-3 rounded-3xl">
              <div className="flex items-center justify-between">
                <p className="font-bold">Heute</p>
                <span className="text-sm font-bold text-accent-600">🔥 4 Tage</span>
              </div>
              {[
                { title: "30 Min. Sport", done: true },
                { title: "Bewerbung schreiben", done: true },
                { title: "Zimmer aufräumen", done: false },
              ].map((t) => (
                <div
                  key={t.title}
                  className="flex items-center gap-3 rounded-xl border border-primary-100 bg-white p-3"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      t.done ? "bg-success-500 text-white" : "border-2 border-primary-200"
                    }`}
                  >
                    {t.done ? "✓" : ""}
                  </span>
                  <span className={t.done ? "line-through text-ink-light" : "font-medium"}>
                    {t.title}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-primary-50 p-3">
                <span className="text-sm font-semibold">Monatsziel: Neue Sneakers</span>
                <span className="text-sm font-bold text-primary-600">140 / 200 ⭐</span>
              </div>
            </Card>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 py-12 sm:grid-cols-3">
          <Card className="space-y-2">
            <div className="text-3xl">✅</div>
            <h3 className="font-bold">Bestätigung durch Freunde</h3>
            <p className="text-sm text-ink-light">
              Niemand kann sich selbst belügen — deine Crew bestätigt, ob du es wirklich
              durchgezogen hast.
            </p>
          </Card>
          <Card className="space-y-2">
            <div className="text-3xl">🔥</div>
            <h3 className="font-bold">Punkte & Streaks</h3>
            <p className="text-sm text-ink-light">
              Sammle Punkte, baue Streaks auf und kassiere Bonuspunkte für Konstanz.
            </p>
          </Card>
          <Card className="space-y-2">
            <div className="text-3xl">🎉</div>
            <h3 className="font-bold">Monatsziele & Belohnungen</h3>
            <p className="text-sm text-ink-light">
              Setz dir ein Ziel, definier deine Belohnung und feiere mit Konfetti, wenn
              du es schaffst.
            </p>
          </Card>
        </section>

        <section className="py-12 text-center">
          <Card className="mx-auto max-w-2xl space-y-4 rounded-3xl bg-primary-500 text-white">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Bereit, dranzubleiben?
            </h2>
            <p className="text-primary-50">
              Erstell deinen Workspace, lade deine Freunde ein und legt heute noch los.
            </p>
            <Link href="/register" className="inline-block">
              <Button size="lg" variant="secondary">
                Jetzt loslegen
              </Button>
            </Link>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-ink-light">
        © {new Date().getFullYear()} Let&apos;s Get Shit Done
      </footer>
    </div>
  );
}
