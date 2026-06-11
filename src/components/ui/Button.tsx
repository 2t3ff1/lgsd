import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.97] shadow-card",
  secondary:
    "bg-accent-500 text-white hover:bg-accent-600 active:scale-[0.97] shadow-card",
  ghost: "bg-transparent text-ink hover:bg-primary-50",
  outline:
    "bg-transparent border-2 border-primary-200 text-primary-700 hover:border-primary-400 hover:bg-primary-50",
  danger: "bg-danger-500 text-white hover:bg-danger-600 active:scale-[0.97]",
};

const sizes: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 rounded-xl",
  md: "text-base px-5 py-2.5 rounded-xl",
  lg: "text-lg px-7 py-3.5 rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
