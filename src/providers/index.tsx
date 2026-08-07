"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Tous les providers client de l'application, regroupés pour que le layout
 * racine reste un Server Component.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Le QueryClient est créé dans un état React pour ne pas être partagé entre
  // deux requêtes rendues côté serveur (fuite de cache entre utilisateurs).
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster
              position="top-center"
              richColors
              toastOptions={{ className: "rounded-2xl border-border shadow-lifted font-sans" }}
            />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
