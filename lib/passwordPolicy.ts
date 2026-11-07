/**
 * Weak-password rules shared by every place a person chooses a password (create account, reset, change, set).
 * Runs in the browser for instant feedback and on the server, which is the one that actually enforces it.
 */

export type WeakReason = "sequence" | "keyboard" | "repeated" | "common" | "contains_name";

// Rows of a keyboard (QWERTY and the French-Canadian AZERTY), read both ways.
const KEYBOARD_ROWS = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm", "azertyuiop", "qsdfghjklm", "wxcvbn"].flatMap((r) => [r, [...r].reverse().join("")]);

const COMMON = new Set([
  "password", "passw0rd", "passwort", "motdepasse", "letmein", "welcome", "admin", "administrator", "iloveyou", "monkey", "dragon",
  "football", "baseball", "master", "login", "princess", "sunshine", "shadow", "superman", "trustno", "freedom", "whatever",
  "transimex", "canada", "canzova", "freight", "logistics", "changeme", "secret", "azerty", "qwerty", "abc",
]);

const strip = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const leet = (s: string, one: "i" | "l") =>
  s.toLowerCase().replace(/[0@$3457!]/g, (c) => ({ "0": "o", "@": "a", "$": "s", "3": "e", "4": "a", "5": "s", "7": "t", "!": one }[c] as string)).replace(/1/g, one).replace(/[^a-z0-9]/g, "");

/** A run of 4+ characters going up or down by one (1234, 4321, abcd, dcba). */
function hasSequence(p: string): boolean {
  const s = p.toLowerCase();
  let up = 1;
  let down = 1;
  for (let i = 1; i < s.length; i++) {
    const a = s.charCodeAt(i - 1);
    const b = s.charCodeAt(i);
    const sameClass = (/[0-9]/.test(s[i]) && /[0-9]/.test(s[i - 1])) || (/[a-z]/.test(s[i]) && /[a-z]/.test(s[i - 1]));
    up = sameClass && b - a === 1 ? up + 1 : 1;
    down = sameClass && a - b === 1 ? down + 1 : 1;
    if (up >= 4 || down >= 4) return true;
  }
  return false;
}

function hasKeyboardRun(p: string): boolean {
  const s = p.toLowerCase();
  for (const row of KEYBOARD_ROWS) {
    for (let i = 0; i + 4 <= row.length; i++) if (s.includes(row.slice(i, i + 4))) return true;
  }
  return false;
}

/** Checks that need nothing about the person (what the browser can verify before it knows the name). */
export function findPatternWeakness(password: string): WeakReason | null {
  if (/(.)\1{3,}/.test(password)) return "repeated";
  if (hasSequence(password)) return "sequence";
  if (hasKeyboardRun(password)) return "keyboard";
  const base = password.toLowerCase().replace(/[^a-z]+$/g, "");
  if (COMMON.has(base) || COMMON.has(strip(password))) return "common";
  return null;
}

/** The person's own name or email in the password (also with 4 for a, 0 for o and similar swaps). */
export function containsPersonalInfo(password: string, ctx: { name?: string; email?: string }): boolean {
  const variants = [strip(password), leet(password, "i"), leet(password, "l")];
  const parts = (ctx.name ?? "").split(/\s+/).map(strip).filter((x) => x.length >= 3);
  const full = strip(ctx.name ?? "");
  const local = strip((ctx.email ?? "").split("@")[0]);
  const needles = [...parts, ...(full.length >= 3 ? [full] : []), ...(local.length >= 4 ? [local] : [])];
  return needles.some((n) => variants.some((v) => v.includes(n)));
}

export function findWeakness(password: string, ctx: { name?: string; email?: string } = {}): WeakReason | null {
  return findPatternWeakness(password) ?? (containsPersonalInfo(password, ctx) ? "contains_name" : null);
}

export const WEAK_TEXT: Record<WeakReason, { en: string; fr: string }> = {
  sequence: { en: "Weak password: it contains a sequence such as 1234 or abcd.", fr: "Mot de passe faible : il contient une suite comme 1234 ou abcd." },
  keyboard: { en: "Weak password: it contains a keyboard pattern such as qwerty or asdf.", fr: "Mot de passe faible : il contient une suite de clavier comme qwerty ou asdf." },
  repeated: { en: "Weak password: it repeats the same character (like aaaa or 1111).", fr: "Mot de passe faible : il répète le même caractère (comme aaaa ou 1111)." },
  common: { en: "Weak password: it is a very common word or password.", fr: "Mot de passe faible : c'est un mot ou un mot de passe très courant." },
  contains_name: { en: "Weak password: it contains your name or email.", fr: "Mot de passe faible : il contient votre nom ou votre courriel." },
};

/** The rules, in the order shown to the person. `ok` is computed live as they type. */
export function passwordRuleList(password: string, ctx: { name?: string; email?: string } = {}, fr = false) {
  return [
    { ok: password.length >= 8, text: fr ? "Au moins 8 caractères" : "At least 8 characters" },
    { ok: /[A-Z]/.test(password), text: fr ? "Une lettre majuscule" : "One uppercase letter" },
    { ok: /[0-9]/.test(password), text: fr ? "Un chiffre" : "One number" },
    { ok: password.length > 0 && !hasSequence(password) && !hasKeyboardRun(password) && !/(.)\1{3,}/.test(password), text: fr ? "Aucune suite (1234, abcd, qwerty) ni caractère répété" : "No sequences (1234, abcd, qwerty) or repeated characters" },
    { ok: password.length > 0 && !containsPersonalInfo(password, ctx) && findPatternWeakness(password) !== "common", text: fr ? "Ne contient pas votre nom, votre courriel ni un mot courant" : "Does not contain your name, email or a common word" },
  ];
}
