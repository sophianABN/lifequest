"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  contentType: string;
}

/** Formats proposés par défaut dans le sélecteur de fichiers. */
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const FILE_ACCEPT = `${IMAGE_ACCEPT},application/pdf`;

/**
 * Bouton de téléversement.
 *
 * Le fichier part vers `/api/uploads`, qui le range dans le stockage objet et
 * renvoie l'URL applicative à enregistrer. Le composant ne connaît ni le
 * bucket ni le fournisseur : il ne manipule qu'une URL.
 */
export function FileUploadButton({
  scope,
  onUploaded,
  accept = FILE_ACCEPT,
  label = "Téléverser",
  variant = "outline",
  size = "sm",
  className,
}: {
  scope: "avatars" | "objectifs" | "journal";
  onUploaded: (file: UploadedFile) => void | Promise<void>;
  accept?: string;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  async function handle(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("scope", scope);

      const res = await fetch("/api/uploads", { method: "POST", body });
      const data = (await res.json()) as UploadedFile | { error: string };

      if (!res.ok || "error" in data) {
        toast.error("error" in data ? data.error : "Le téléversement a échoué.");
        return;
      }
      await onUploaded(data);
    } catch {
      toast.error("Le téléversement a échoué. Vérifie ta connexion.");
    } finally {
      setUploading(false);
      // Remettre la valeur à zéro permet de re-sélectionner le même fichier.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handle(file);
        }}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn("gap-2", className)}
      >
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {uploading ? "Envoi…" : label}
      </Button>
    </>
  );
}
