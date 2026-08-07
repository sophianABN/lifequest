"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer size-5 shrink-0 rounded-lg border-2 border-input transition-all duration-200",
      "hover:border-blush-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blush-300/25",
      "data-[state=checked]:border-transparent data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-blush-400 data-[state=checked]:to-lilac-400 data-[state=checked]:text-white",
      "disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="grid place-items-center text-current animate-in zoom-in-50 duration-200">
      <Check className="size-3.5" strokeWidth={3.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;
