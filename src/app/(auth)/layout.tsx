import Link from "next/link";

import { APP } from "@/lib/constants";
import { AuroraBackground, DoodleConfetti, DoodleHeart, DoodleMountain, Sparkle, StarField } from "@/components/shared/decorations";

/** Layout plein écran des pages publiques : marque à gauche, formulaire à droite. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh lg:grid-cols-2">
      <AuroraBackground />

      {/* Panneau de marque — masqué sur mobile pour laisser la place au formulaire */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blush-200 via-lilac-200 to-aqua-200 p-10 dark:from-blush-900/60 dark:via-lilac-900/60 dark:to-aqua-900/50 lg:flex">
        <StarField count={18} />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/70 backdrop-blur dark:bg-white/10">
            <Sparkle size={22} className="text-blush-500" />
          </span>
          <span className="font-display text-2xl">{APP.name}</span>
        </Link>

        <div className="relative max-w-md">
          <DoodleMountain className="mb-6 w-36 text-blush-500/70 dark:text-blush-200/60" />
          <h2 className="font-display text-4xl leading-tight">
            Tes rêves méritent
            <br />
            mieux qu&apos;une liste.
          </h2>
          <p className="mt-4 text-base text-ink-700 dark:text-ink-200">
            LifeQuest découpe tes grands objectifs en étapes, calcule ce qui est réalisable
            maintenant, et te rappelle pourquoi tu as commencé.
          </p>

          <ul className="mt-8 space-y-3 text-sm">
            {[
              "Une priorisation qui tient compte de ton âge, ton budget et ton temps",
              "Un calendrier, un Kanban et une frise sur plusieurs années",
              "Un assistant qui génère tes étapes, ton planning et ton budget",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Sparkle size={14} className="mt-1 shrink-0 text-gold-500" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 text-blush-600/70 dark:text-blush-200/50">
          <DoodleHeart className="w-7" />
          <DoodleConfetti className="w-20" />
        </div>
      </section>

      {/* Formulaire */}
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </div>
  );
}
