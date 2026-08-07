"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/constants";

export const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    /** Couleur de marque (blush, lilac…) ; par défaut un dégradé rose→lavande. */
    color?: string;
    size?: "sm" | "md" | "lg";
  }
>(({ className, value, color, size = "md", ...props }, ref) => {
  const heights = { sm: "h-1.5", md: "h-2.5", lg: "h-4" };
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative w-full overflow-hidden rounded-full bg-muted", heights[size], className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 rounded-full bg-gradient-to-r transition-transform duration-700 ease-out",
          color ? colorClasses(color).gradient : "from-blush-300 via-blush-400 to-lilac-400",
        )}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

/** Jauge circulaire — utilisée pour la progression globale de la quête. */
export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 10,
  children,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <div className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="lq-progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8bbd0" />
            <stop offset="50%" stopColor="#c9b6e4" />
            <stop offset="100%" stopColor="#a7e8e0" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-muted"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="url(#lq-progress-gradient)"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}
