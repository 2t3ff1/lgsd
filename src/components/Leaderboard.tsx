import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { StreakBadge } from "@/components/ui/StreakBadge";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const medals = ["🥇", "🥈", "🥉"];

export function Leaderboard({
  entries,
}: {
  entries: { profile: Profile; points: number; streak: number; isOwn: boolean }[];
}) {
  const sorted = [...entries].sort((a, b) => b.points - a.points);

  return (
    <Card className="rounded-2xl">
      <h2 className="mb-3 font-bold">🏆 Rangliste</h2>
      <ul className="space-y-1.5">
        {sorted.map((entry, i) => (
          <li
            key={entry.profile.id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2",
              entry.isOwn ? "bg-surface-muted" : ""
            )}
          >
            <span className="w-6 text-center font-bold text-ink-light">
              {medals[i] ?? `#${i + 1}`}
            </span>
            <Avatar name={entry.profile.display_name} url={entry.profile.avatar_url} size="sm" />
            <span className="flex-1 truncate font-semibold">
              {entry.profile.display_name} {entry.isOwn && <span className="text-primary-500">(Du)</span>}
            </span>
            <StreakBadge streak={entry.streak} />
            <span className="w-14 text-right font-bold text-primary-600">{entry.points} Pkt.</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
