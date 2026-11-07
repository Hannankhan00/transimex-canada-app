/**
 * Rules for the password someone chooses to replace a temporary one that another person set. Stricter than the
 * general 8-character minimum, because this is the moment the account becomes the owner's alone.
 */
import { WEAK_TEXT, findWeakness, type WeakReason } from "./passwordPolicy";

export const NEW_PASSWORD_MIN_LENGTH = 10;
export const NEW_PASSWORD_MAX_LENGTH = 128;

export type PasswordProblem = "too_short" | "too_long" | "same_as_current" | "needs_letter_and_number" | "contains_email" | "too_repetitive" | WeakReason;

/** Returns what is wrong with the new password, or null when it is acceptable. */
export function checkNewPassword(params: { current: string; next: string; email?: string; name?: string }): PasswordProblem | null {
  const { current, next } = params;
  if (next.length < NEW_PASSWORD_MIN_LENGTH) return "too_short";
  if (next.length > NEW_PASSWORD_MAX_LENGTH) return "too_long";
  if (next === current) return "same_as_current";
  if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return "needs_letter_and_number";
  const local = (params.email ?? "").split("@")[0].toLowerCase();
  if (local.length >= 4 && next.toLowerCase().includes(local)) return "contains_email";
  if (new Set(next).size < 4) return "too_repetitive";
  return findWeakness(next, { name: params.name, email: params.email });
}

export const PASSWORD_PROBLEM_TEXT: Record<PasswordProblem, { en: string; fr: string }> = {
  ...WEAK_TEXT,
  too_short: { en: `Use at least ${NEW_PASSWORD_MIN_LENGTH} characters.`, fr: `Utilisez au moins ${NEW_PASSWORD_MIN_LENGTH} caractères.` },
  too_long: { en: `Use at most ${NEW_PASSWORD_MAX_LENGTH} characters.`, fr: `Utilisez au plus ${NEW_PASSWORD_MAX_LENGTH} caractères.` },
  same_as_current: { en: "Choose a password different from the temporary one.", fr: "Choisissez un mot de passe différent du mot de passe temporaire." },
  needs_letter_and_number: { en: "Include at least one letter and one number.", fr: "Incluez au moins une lettre et un chiffre." },
  contains_email: { en: "Do not use your email address in your password.", fr: "N'utilisez pas votre adresse courriel dans votre mot de passe." },
  too_repetitive: { en: "That password is too repetitive. Use a mix of different characters.", fr: "Ce mot de passe est trop répétitif. Utilisez un mélange de caractères différents." },
};
