import { randomUUID } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
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
