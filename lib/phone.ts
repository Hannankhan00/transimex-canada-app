import type React from "react";

/** Keeps only digits and "+": what a phone field accepts, typed or pasted. */
export const sanitizePhone = (v: string) => v.replace(/[^0-9+]/g, "");

export const isPhoneChars = (v: string) => /^[0-9+]*$/.test(v);

/** Blocks any other typed character (shortcuts and navigation keys still work). */
export const phoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.ctrlKey || e.metaKey || e.key.length > 1) return;
  if (!/[0-9+]/.test(e.key)) e.preventDefault();
};
