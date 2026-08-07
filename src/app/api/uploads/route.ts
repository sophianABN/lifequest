import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  buildKey,
  isStorageEnabled,
  publicPath,
  putObject,
  type UploadScope,
} from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const SCOPES: UploadScope[] = ["avatars", "objectifs", "journal"];

/**
 * Téléversement d'un fichier.
 *
 * Les octets transitent par l'application plutôt que par une URL présignée :
 * le navigateur n'a donc rien à savoir du stockage, et surtout il n'y a aucune
 * politique CORS à configurer sur le bucket — la première cause d'échec d'un
 * déploiement MinIO ou R2.
 *
 * Le type MIME est relu depuis le fichier lui-même, jamais depuis un champ du
 * formulaire : c'est lui qui décide de l'extension et de l'acceptation.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  if (!isStorageEnabled()) {
    return NextResponse.json(
      { error: "Le stockage de fichiers n'est pas configuré sur ce serveur." },
      { status: 503 },
    );
  }

  // Un compte authentifié pourrait sinon remplir le bucket en boucle.
  const limit = rateLimit(`upload:${userId}`, 60, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de fichiers envoyés. Réessaie dans un moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const rawScope = String(form?.get("scope") ?? "objectifs");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }
  const scope = (SCOPES as string[]).includes(rawScope)
    ? (rawScope as UploadScope)
    : ("objectifs" as UploadScope);

  if (!ALLOWED_TYPES[file.type]) {
    return NextResponse.json(
      { error: "Format non accepté : images (JPEG, PNG, WebP, GIF, AVIF) et PDF uniquement." },
      { status: 415 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Fichier vide" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop lourd (maximum ${MAX_UPLOAD_BYTES / 1024 / 1024} Mo).` },
      { status: 413 },
    );
  }

  const key = buildKey(userId, scope, file.type);

  try {
    await putObject(key, new Uint8Array(await file.arrayBuffer()), file.type);
  } catch {
    return NextResponse.json({ error: "Le stockage n'a pas accepté le fichier." }, { status: 502 });
  }

  return NextResponse.json({
    url: publicPath(key),
    name: file.name,
    size: file.size,
    contentType: file.type,
  });
}
