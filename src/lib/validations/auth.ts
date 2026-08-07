import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Adresse e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Au moins 2 caractères").max(50),
    email: z.email("Adresse e-mail invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    confirmPassword: z.string(),
    birthDate: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
