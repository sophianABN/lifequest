import { Quote as QuoteIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StarField } from "@/components/shared/decorations";

/** Citation du jour — stable sur 24 h grâce au tirage déterministe côté serveur. */
export function QuoteCard({ text, author }: { text: string; author?: string | null }) {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-lilac-100 to-blush-100 dark:from-lilac-900/40 dark:to-blush-900/30">
      <StarField count={7} />
      <div className="relative p-5">
        <QuoteIcon className="size-6 text-lilac-400 dark:text-lilac-300" />
        <blockquote className="mt-2.5 font-hand text-xl leading-snug text-ink-800 dark:text-ink-100">
          « {text} »
        </blockquote>
        {author && <p className="mt-2 text-xs font-semibold text-muted-foreground">— {author}</p>}
      </div>
    </Card>
  );
}
