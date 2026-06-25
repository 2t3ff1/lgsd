import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { Avatar } from "@/components/ui/Avatar";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppHeader({
  displayName,
  avatarUrl,
  avatarColor,
  backHref,
  backLabel,
}: {
  displayName: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Logo className="text-lg" />
          </Link>
          {backHref && (
            <Link
              href={backHref}
              className="hidden text-sm font-semibold text-ink-light hover:text-primary-600 sm:inline"
            >
              ← {backLabel ?? "Zurück"}
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/profile" className="flex items-center gap-2">
            <Avatar name={displayName} url={avatarUrl} color={avatarColor} size="sm" />
            <span className="hidden text-sm font-semibold sm:inline">{displayName}</span>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
