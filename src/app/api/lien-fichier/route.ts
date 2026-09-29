import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { isStorageEnabled, keyFromPath, ownsKey, signedPath } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Délivre un lien signé vers un fichier de l'utilisateur connecté.
 *
 *   GET /api/lien-fichier?chemin=/api/fichiers/<clé>  →  { url }
 *
 * Utilisé par l'application mobile pour ouvrir une pièce jointe dans le
 * navigateur intégré (voir `openStoredFile`). Une lecture seule : le compte
 * de démonstration y a droit comme à l'affichage du fichier lui-même.
 */
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isStorageEnabled()) {
    return NextResponse.json({ error: "Stockage non configuré" }, { status: 503 });
  }

  const chemin = new URL(request.url).searchParams.get("chemin") ?? "";
  const key = keyFromPath(chemin);
  if (!key || !ownsKey(userId, key)) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json(
    { url: signedPath(key) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
