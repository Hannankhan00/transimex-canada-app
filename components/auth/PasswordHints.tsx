"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { findPatternWeakness, findWeakness, passwordRuleList, WEAK_TEXT } from "@/lib/passwordPolicy";

/** Live checklist of the password rules, with a clear "weak" warning when a sequence, common word or the name is used. */
export default function PasswordHints({
  password,
  name,
  email,
  fr,
  className = "",
}: {
  password: string;
  name?: string;
  email?: string;
  fr: boolean;
  className?: string;
}) {
  const rules = passwordRuleList(password, { name, email }, fr);
  const weak = password ? findWeakness(password, { name, email }) : null;

  return (
    <div className={`rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 ${className}`}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600">{fr ? "Votre mot de passe doit" : "Your password must"}</p>
      <ul className="space-y-1">
        {rules.map((r) => {
          const started = password.length > 0;
          return (
            <li key={r.text} className={`flex items-start gap-2 text-[11.5px] leading-snug ${!started ? "text-slate-500" : r.ok ? "text-emerald-700" : "text-red-600"}`}>
              {started && r.ok ? <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> : started ? <X className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> : <span className="mt-1.5 ml-1 mr-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />}
              <span>{r.text}</span>
            </li>
          );
        })}
      </ul>
      {weak && <p className="mt-2 text-[11.5px] font-semibold text-red-600">{fr ? WEAK_TEXT[weak].fr : WEAK_TEXT[weak].en}</p>}
    </div>
  );
}

/** First problem with a new password the browser can see, or null. `name` and `email` make the personal-info check possible. */
export function passwordProblem(password: string, fr: boolean, who: { name?: string; email?: string } = {}): string | null {
  if (password.length < 8) return fr ? "Le mot de passe doit contenir au moins 8 caractères." : "The password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return fr ? "Ajoutez une lettre majuscule." : "Add an uppercase letter.";
  if (!/[0-9]/.test(password)) return fr ? "Ajoutez un chiffre." : "Add a number.";
  const weak = findWeakness(password, who);
  return weak ? (fr ? WEAK_TEXT[weak].fr : WEAK_TEXT[weak].en) : null;
}

export { findPatternWeakness };
