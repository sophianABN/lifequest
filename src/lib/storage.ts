import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Stockage objet compatible S3 — MinIO, Cloudflare R2, Scaleway, AWS…
 *
 * Comme l'assistant, c'est une capacité optionnelle : sans configuration,
 * `isStorageEnabled()` renvoie `false` et l'interface retombe sur la saisie
 * d'une URL externe. Aucun écran ne casse.
 *
 * Les fichiers ne sont jamais publics : ils sont relus par `/api/fichiers/…`,
 * qui vérifie que la clé appartient bien à l'utilisateur connecté. C'est le
 * choix par défaut pour un journal intime et des documents personnels.
 */

/** Taille maximale acceptée, en octets. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Types autorisés → extension de fichier. */
export const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

function env(name: string) {
  return process.env[name]?.trim() || null;
}

export function isStorageEnabled() {
  return Boolean(
    env("S3_BUCKET") && env("S3_ACCESS_KEY_ID") && env("S3_SECRET_ACCESS_KEY") && env("S3_ENDPOINT"),
  );
}

export function bucket() {
  const name = env("S3_BUCKET");
  if (!name) throw new Error("S3_BUCKET est absent : le stockage n'est pas configuré.");
  return name;
}

let cached: S3Client | null = null;

function client() {
  if (cached) return cached;
  cached = new S3Client({
    // R2 et MinIO ignorent la région mais la signature v4 en exige une.
    region: env("S3_REGION") ?? "auto",
    endpoint: env("S3_ENDPOINT") ?? undefined,
    // MinIO sert les buckets en sous-chemin (`http://host/bucket/clé`) et non
    // en sous-domaine : sans cette option, toutes les requêtes tombent à côté.
    forcePathStyle: env("S3_FORCE_PATH_STYLE") !== "false",
    credentials: {
      accessKeyId: env("S3_ACCESS_KEY_ID") ?? "",
      secretAccessKey: env("S3_SECRET_ACCESS_KEY") ?? "",
    },
  });
  return cached;
}

/** Portées de stockage — servent uniquement à ranger les clés lisiblement. */
export type UploadScope = "avatars" | "objectifs" | "journal";

/**
 * Construit une clé d'objet. Le préfixe `<userId>/` porte l'autorisation :
 * la route de lecture n'a qu'à vérifier ce préfixe.
 */
export function buildKey(userId: string, scope: UploadScope, contentType: string) {
  const extension = ALLOWED_TYPES[contentType] ?? "bin";
  return `${userId}/${scope}/${randomUUID()}.${extension}`;
}

/** Vrai si la clé appartient à cet utilisateur. */
export function ownsKey(userId: string, key: string) {
  return key.startsWith(`${userId}/`);
}

/** URL applicative servie par `/api/fichiers/[...key]`. */
export function publicPath(key: string) {
  return `/api/fichiers/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/* ── Liens signés ─────────────────────────────────────────────────────────── */

/** Durée de validité d'un lien signé : le temps d'ouvrir le fichier. */
const SIGNED_LINK_TTL_S = 10 * 60;

function signature(key: string, expires: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET est absent : impossible de signer un lien.");
  return createHmac("sha256", secret).update(`fichier:${key}:${expires}`).digest("base64url");
}

/**
 * URL de lecture valable quelques minutes sans session.
 *
 * Sert à l'application mobile : elle ouvre les documents dans le navigateur
 * intégré du système, qui ne partage pas ses cookies. La signature couvre la
 * clé et l'échéance — impossible de la réutiliser pour un autre fichier ou
 * au-delà du délai.
 */
export function signedPath(key: string) {
  const expires = Math.floor(Date.now() / 1000) + SIGNED_LINK_TTL_S;
  return `${publicPath(key)}?expire=${expires}&signature=${signature(key, expires)}`;
}

/** Vrai si la signature correspond à la clé et n'a pas expiré. */
export function verifySignedPath(key: string, expires: string | null, provided: string | null) {
  if (!expires || !provided) return false;
  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt < Date.now() / 1000) return false;
  const expected = Buffer.from(signature(key, expiresAt));
  const received = Buffer.from(provided);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** Extrait la clé d'une URL produite par `publicPath`, sinon `null`. */
export function keyFromPath(url: string) {
  if (!url.startsWith("/api/fichiers/")) return null;
  return url
    .slice("/api/fichiers/".length)
    .split("/")
    .map(decodeURIComponent)
    .join("/");
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

export async function getObject(key: string) {
  const response = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  if (!response.Body) return null;
  return {
    stream: response.Body.transformToWebStream(),
    contentType: response.ContentType ?? "application/octet-stream",
    contentLength: response.ContentLength,
  };
}

/**
 * Supprime un objet. Les erreurs sont avalées : un fichier déjà absent ou un
 * stockage momentanément injoignable ne doit pas empêcher la suppression de
 * l'entrée en base, sinon l'utilisateur reste bloqué avec une ligne fantôme.
 */
export async function deleteObject(key: string) {
  try {
    await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch {
    // Sans effet côté utilisateur.
  }
}

/**
 * Supprime l'objet correspondant à une URL applicative, si c'en est une.
 *
 * L'appelant fournit son `userId` : même si une URL trafiquée arrivait
 * jusqu'ici, la vérification de préfixe empêche de supprimer le fichier d'un
 * autre compte. Une URL externe n'est simplement pas concernée.
 */
export async function deleteByUrl(url: string | null | undefined, userId: string) {
  if (!url || !isStorageEnabled()) return;
  const key = keyFromPath(url);
  if (key && ownsKey(userId, key)) await deleteObject(key);
}

/**
 * Supprime tous les fichiers d'un compte — suppression du compte.
 *
 * Le préfixe `<userId>/` regroupe avatar, pièces jointes et photos du
 * journal : une liste paginée, puis des suppressions par lots de mille (la
 * limite de l'API S3). Contrairement à `deleteObject`, les erreurs remontent :
 * l'appelant doit savoir si des fichiers personnels sont restés en place.
 */
export async function deleteAllForUser(userId: string) {
  if (!isStorageEnabled()) return;
  let continuationToken: string | undefined;
  do {
    const page = await client().send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: `${userId}/`,
        ContinuationToken: continuationToken,
      }),
    );
    const objects = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (objects.length > 0) {
      await client().send(
        new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: objects, Quiet: true } }),
      );
    }
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
}
