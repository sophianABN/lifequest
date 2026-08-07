import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blush-100 text-blush-700 dark:bg-blush-900/50 dark:text-blush-200",
        // Alias de `default` : permet de passer directement une couleur de marque
        // issue de COLOR_CLASSES sans table de conversion.
        blush: "border-transparent bg-blush-100 text-blush-700 dark:bg-blush-900/50 dark:text-blush-200",
        lilac: "border-transparent bg-lilac-100 text-lilac-700 dark:bg-lilac-900/50 dark:text-lilac-200",
        aqua: "border-transparent bg-aqua-100 text-aqua-700 dark:bg-aqua-900/50 dark:text-aqua-200",
        gold: "border-transparent bg-gold-100 text-gold-700 dark:bg-gold-900/50 dark:text-gold-200",
        mint: "border-transparent bg-mint-300/30 text-aqua-800 dark:text-mint-300",
        peach: "border-transparent bg-peach-300/30 text-gold-800 dark:text-peach-300",
        outline: "border-border text-muted-foreground",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
