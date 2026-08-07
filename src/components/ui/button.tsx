import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base commune : arrondi généreux, transition douce, léger enfoncement au clic.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-br from-blush-400 to-blush-500 text-white shadow-glow-blush hover:from-blush-500 hover:to-blush-600 hover:shadow-lifted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-lilac-200 dark:hover:bg-lilac-800/60",
        outline:
          "border border-border bg-card/60 text-foreground hover:bg-muted hover:border-blush-300",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        soft: "bg-blush-100 text-blush-700 hover:bg-blush-200 dark:bg-blush-900/40 dark:text-blush-200 dark:hover:bg-blush-900/70",
        gold: "bg-gradient-to-br from-gold-300 to-gold-500 text-gold-900 shadow-glow-gold hover:from-gold-400 hover:to-gold-600",
        destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
        link: "text-blush-600 underline-offset-4 hover:underline dark:text-blush-300",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-5",
        lg: "h-12 px-7 text-base",
        icon: "size-10",
        "icon-sm": "size-8 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" />
            {!asChild && children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
