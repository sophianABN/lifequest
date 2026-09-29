import { auth } from "@/lib/auth";
import { ALLOWED_TYPES, getObject, isStorageEnabled, ownsKey, verifySignedPath } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Sert un fichier du stockage objet.
 *
 * Le bucket reste privé : c'est cette route qui autorise. La clé commence par
 * l'identifiant de son propriétaire, la vérification tient donc en une
 * comparaison de préfixe — impossible de deviner l'URL d'un fichier d'autrui,
 * et impossible de la lire même en la connaissant.
 *
 * Seconde voie : un lien signé (`?expire=…&signature=…`, voir `signedPath`),
 * délivré au propriétaire par `/api/lien-fichier`. Il autorise la lecture sans
 * session pendant quelques minutes — c'est ce qu'ouvre l'application mobile
 * dans le navigateur intégré, qui n'a pas les cookies de l'application.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (!isStorageEnabled()) return new Response("Stockage non configuré", { status: 503 });

  const key = (await params).key.map(decodeURIComponent).join("/");
  const search = new URL(request.url).searchParams;
  const signed = verifySignedPath(key, search.get("expire"), search.get("signature"));

  if (!signed) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return new Response("Non authentifié", { status: 401 });
    // On renvoie 404 plutôt que 403 : inutile de confirmer qu'un fichier existe.
    if (!ownsKey(userId, key)) return new Response("Introuvable", { status: 404 });
  }

  try {
    const object = await getObject(key);
    if (!object) return new Response("Introuvable", { status: 404 });

    // Le type est réimposé depuis notre propre liste blanche : ce qui remonte
    // du stockage a beau venir de nous, on ne le laisse pas décider comment le
    // navigateur interprétera le fichier.
    const contentType = ALLOWED_TYPES[object.contentType]
      ? object.contentType
      : "application/octet-stream";

    return new Response(object.stream, {
      headers: {
        "Content-Type": contentType,
        ...(object.contentLength ? { "Content-Length": String(object.contentLength) } : {}),
        // Sans `nosniff`, un navigateur pourrait deviner « HTML » sur un
        // fichier téléversé et l'exécuter dans l'origine de l'application.
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        // `private` : jamais mis en cache par un proxy partagé, le contenu
        // dépend de la session. Les clés sont immuables, d'où la durée longue
        // — sauf pour un lien signé, qui ne doit pas survivre à son échéance.
        "Cache-Control": signed ? "private, no-store" : "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
