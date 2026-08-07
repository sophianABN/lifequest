import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm transition-all",
        "placeholder:text-muted-foreground/70",
        "focus-visible:outline-none focus-visible:border-blush-300 focus-visible:ring-4 focus-visible:ring-blush-300/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm transition-all resize-y",
      "placeholder:text-muted-foreground/70",
      "focus-visible:outline-none focus-visible:border-blush-300 focus-visible:ring-4 focus-visible:ring-blush-300/20",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
