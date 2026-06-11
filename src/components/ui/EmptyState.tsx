import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/50 px-6 py-12 text-center">
      {icon && <div className="text-4xl">{icon}</div>}
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-light">{description}</p>}
      {action}
    </div>
  );
}
