import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";

import { APP } from "@/lib/constants";
import { AuroraBackground } from "@/components/shared/decorations";
import { LogoMark, MARK_RADIUS } from "@/components/shared/logo";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Quelles données LifeQuest conserve, pourquoi, et comment les supprimer.",
};

/** Dernière révision du texte — à mettre à jour à chaque changement de fond. */
const REVISION = "29 septembre 2026";

/**
 * Politique de confidentialité — publique.
 *
 * Exigée par l'App Store et le Play Store (URL renseignée dans les deux
 * fiches), et lue par quiconque hésite à confier ses rêves à une application.
 * Elle décrit ce que fait réellement le code : chaque section renvoie à une
 * donnée du schéma ou à un service effectivement appelé.
 *
 * L'adresse de contact vient de `CONTACT_EMAIL`, lue à l'exécution : la page
 * n'est pas figée au build, pour qu'un changement d'adresse n'exige pas de
 * reconstruire l'image.
 */
export default async function PrivacyPage() {
  await connection();
  const contact = process.env.CONTACT_EMAIL?.trim() || null;

  return (
    <div className="relative min-h-dvh px-5 pt-[calc(2.5rem+var(--safe-top))] pb-[calc(4rem+var(--safe-bottom))] sm:px-8">
      <AuroraBackground />

      <article className="relative mx-auto max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Retour à {APP.name}
        </Link>

        <header className="mt-8 flex items-center gap-4">
          <LogoMark size={52} className={`${MARK_RADIUS} shadow-lifted`} />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">Confidentialité</h1>
            <p className="mt-1 text-sm text-muted-foreground">Mise à jour le {REVISION}</p>
          </div>
        </header>

        <div className="mt-10 space-y-9 text-[0.95rem] leading-relaxed text-ink-700 dark:text-ink-200 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:mt-2 [&_ul]:space-y-1.5">
          <section>
            <p>
              {APP.name} t&apos;aide à réaliser tes grands objectifs de vie. Pour cela, l&apos;application
              conserve ce que tu lui confies — tes objectifs, ton journal, ton profil. Cette page dit
              exactement quoi, pourquoi, et comment tout effacer. En résumé : <strong>aucune
              publicité, aucun traceur, aucune revente</strong>. Tes données servent à une seule
              chose, faire fonctionner ta quête.
            </p>
          </section>

          <section>
            <h2>Ce que nous conservons</h2>
            <ul>
              <li>
                <strong>Ton compte</strong> : nom, adresse e-mail et mot de passe — jamais en clair :
                seule une empreinte irréversible (bcrypt) est conservée, personne ne peut le
                retrouver.
              </li>
              <li>
                <strong>Ton profil</strong>, si tu le renseignes : date de naissance, ville, pays,
                niveau d&apos;études, biographie, photo, temps libre, épargne mensuelle et budget
                disponible, compétences, langues et contraintes. Ils alimentent les recommandations.
              </li>
              <li>
                <strong>Ta quête</strong> : objectifs, étapes, listes, budgets, commentaires,
                événements du calendrier, pièces jointes et les prénoms des personnes que tu associes
                à un objectif.
              </li>
              <li>
                <strong>Ton journal</strong> : entrées, humeur, gratitudes et photos.
              </li>
              <li>
                <strong>Tes conversations avec l&apos;assistant</strong>, pour que tu puisses les
                reprendre.
              </li>
              <li>
                <strong>Ta progression</strong> : points d&apos;expérience, badges, série de jours,
                notifications.
              </li>
            </ul>
          </section>

          <section>
            <h2>Ce que nous ne faisons pas</h2>
            <ul>
              <li>Aucune mesure d&apos;audience, aucun outil publicitaire, aucun traceur tiers.</li>
              <li>Aucune vente ni location de données, à qui que ce soit.</li>
              <li>Aucun accès à ta position, à tes contacts ni à ton micro.</li>
            </ul>
            <p className="mt-3">
              Le seul cookie posé est celui de ta session de connexion (et sa protection contre la
              falsification de requêtes). Ton choix de thème clair ou sombre reste dans ton
              navigateur.
            </p>
          </section>

          <section>
            <h2>Qui d&apos;autre y a accès</h2>
            <ul>
              <li>
                <strong>L&apos;hébergement</strong> : l&apos;application et sa base de données tournent
                sur un serveur privé qui lui est dédié ; tes fichiers sont dans un stockage objet
                privé, lisible uniquement à travers ton compte. Le trafic passe par Cloudflare, qui
                protège le site et chiffre la connexion.
              </li>
              <li>
                <strong>L&apos;assistant</strong> : quand tu lui écris, ton message et le contexte
                utile (profil, objectifs, étapes en cours) sont transmis au fournisseur du modèle de
                langage — Mistral AI ou Anthropic — le temps de rédiger la réponse. Si aucun
                fournisseur n&apos;est configuré, l&apos;assistant répond avec son moteur interne et
                rien ne quitte le serveur.
              </li>
            </ul>
          </section>

          <section>
            <h2>Application mobile</h2>
            <p>
              L&apos;application iOS et Android affiche le même service et les mêmes données. Elle
              peut en plus :
            </p>
            <ul>
              <li>
                utiliser l&apos;appareil photo ou ta galerie, <em>uniquement</em> quand tu choisis une
                photo à joindre ;
              </li>
              <li>
                programmer un rappel quotidien, si tu l&apos;actives : il est planifié sur ton
                téléphone et n&apos;envoie rien au serveur.
              </li>
            </ul>
          </section>

          <section>
            <h2>Combien de temps</h2>
            <p>
              Tant que ton compte existe. Une copie de sauvegarde de la base est faite chaque jour et
              conservée 14 jours : après la suppression de ton compte, tes données disparaissent donc
              aussi des sauvegardes sous deux semaines au plus.
            </p>
          </section>

          <section id="suppression" className="scroll-mt-8">
            <h2>Supprimer ton compte</h2>
            <p>
              Dans l&apos;application ou sur le site : <strong>Paramètres → Supprimer mon
              compte</strong>, puis confirme avec ton mot de passe. Ton profil, tes objectifs, ton
              journal, tes conversations et tous tes fichiers sont effacés immédiatement et
              définitivement.
            </p>
            {contact && (
              <p className="mt-3">
                Tu n&apos;as plus accès à ton compte ? Écris-nous depuis ton adresse d&apos;inscription à{" "}
                <a className="font-semibold underline underline-offset-2" href={`mailto:${contact}`}>
                  {contact}
                </a>{" "}
                et nous le supprimerons pour toi.
              </p>
            )}
          </section>

          <section>
            <h2>Tes droits</h2>
            <p>
              Tu peux consulter et corriger tes données à tout moment dans l&apos;application, les
              supprimer comme décrit ci-dessus, ou demander une copie de tout ce que nous conservons
              {contact ? (
                <>
                  {" "}à{" "}
                  <a className="font-semibold underline underline-offset-2" href={`mailto:${contact}`}>
                    {contact}
                  </a>
                </>
              ) : null}
              . Si une réponse ne te satisfait pas, tu peux saisir la CNIL (cnil.fr).
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
