import { cn, avatarColor, getInitials } from "@/lib/utils";

export function Avatar({
  name,
  url,
  color,
  size = "md",
  className,
}: {
  name: string;
  url?: string | null;
  color?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    xs: "h-4 w-4 text-[8px]",
    sm: "h-8 w-8 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-xl",
  };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-bold text-white shrink-0",
        !color && avatarColor(name),
        sizes[size],
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {getInitials(name)}
    </div>
  );
}
