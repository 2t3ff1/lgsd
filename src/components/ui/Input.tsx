import { InputHTMLAttributes, forwardRef, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Label = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("block text-sm font-semibold text-ink mb-1.5", className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-xl border-2 border-primary-100 bg-white px-4 py-2.5 text-ink placeholder:text-ink-light/60 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border-2 border-primary-100 bg-white px-4 py-2.5 text-ink placeholder:text-ink-light/60 transition-colors focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
