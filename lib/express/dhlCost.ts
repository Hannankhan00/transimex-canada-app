import { z } from "zod";

/** Money typed by staff, in dollars, to whole cents. */
const dollars = z
  .number({ invalid_type_error: "Enter an amount" })
  .min(0, "Amount cannot be negative")
  .max(100000, "Amount is too large")
  .transform((v) => Math.round(v * 100));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || undefined);

/** Staff enter what DHL really charged for one shipment. null clears it (the quoted cost is used again). */
export const dhlActualSchema = z.object({
  charge: dollars.nullable(),
  invoiceNumber: optionalText(60),
  note: optionalText(300),
});

export const dhlInvoiceCreateSchema = z.object({
  number: z.string({ required_error: "Invoice number is required" }).trim().min(1, "Invoice number is required").max(60),
  total: dollars,
  issuedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-31")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  note: optionalText(300),
});

export const dhlInvoicePatchSchema = z.object({
  status: z.enum(["unpaid", "paid"]),
  paidNote: optionalText(300),
});

/** Splits one CSV line, honouring double quotes. */
function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** "1,234.56", "$1 234,56" and "(12.30)" to cents. Returns null when it is not an amount. */
export function parseMoneyToCents(raw: string): number | null {
  let t = raw.replace(/[^\d.,()\-\s]/g, "").trim();
  if (!t) return null;
  const negative = /^\(.*\)$/.test(t) || t.startsWith("-");
  t = t.replace(/[()\-\s]/g, "");
  if (!/\d/.test(t)) return null;
  // The separator that comes last, with one or two digits after it, is the decimal point.
  const decimalAt = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
  let normalised: string;
  if (decimalAt >= 0 && t.length - decimalAt - 1 <= 2) normalised = `${t.slice(0, decimalAt).replace(/[.,]/g, "")}.${t.slice(decimalAt + 1)}`;
  else normalised = t.replace(/[.,]/g, "");
  const value = Number(normalised);
  if (!Number.isFinite(value)) return null;
  return (negative ? -1 : 1) * Math.round(value * 100);
}

export interface DhlInvoiceLine {
  /** The DHL waybill (tracking) number. */
  waybill: string;
  chargeCents: number;
}

export interface DhlInvoiceParse {
  lines: DhlInvoiceLine[];
  /** Rows that had no waybill or no readable amount. */
  skipped: number;
  /** Set when the file could not be understood at all. */
  error?: string;
}

const WAYBILL_HEAD = /waybill|awb|tracking|shipment\s*(number|no|id)/i;
const AMOUNT_REJECT = /tax|vat|gst|discount|weight|rate|piece/i;
// Most specific heading first: a bare "amount" is only used when nothing better exists.
const AMOUNT_HEADS: { pattern: RegExp; allowReject: boolean }[] = [
  { pattern: /total\s*amount.*(excl|before)/i, allowReject: true },
  { pattern: /total\s*amount|total\s*charge|total\s*billed|net\s*amount/i, allowReject: true },
  { pattern: /amount|charge|total/i, allowReject: false },
];

/**
 * Reads a DHL invoice detail export (CSV, comma, semicolon or tab separated) into one charge per waybill. It finds
 * the waybill and amount columns by their headings; a waybill that appears on several rows is added together.
 * Best effort: the caller shows the result for approval before saving anything.
 */
export function parseDhlInvoiceCsv(text: string): DhlInvoiceParse {
  const rows = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (rows.length < 2) return { lines: [], skipped: 0, error: "The file has no rows." };

  const count = (re: RegExp) => (rows[0].match(re) || []).length;
  const delimiter = count(/;/g) > count(/,/g) ? ";" : count(/\t/g) > count(/,/g) ? "\t" : ",";
  const headers = splitCsvLine(rows[0], delimiter);
  const waybillCol = headers.findIndex((h) => WAYBILL_HEAD.test(h));
  let amountCol = -1;
  for (const { pattern, allowReject } of AMOUNT_HEADS) {
    amountCol = headers.findIndex((h) => pattern.test(h) && (allowReject || !AMOUNT_REJECT.test(h)));
    if (amountCol >= 0) break;
  }
  if (waybillCol < 0 || amountCol < 0) return { lines: [], skipped: 0, error: "Could not find a waybill column and an amount column in the first row." };

  const byWaybill = new Map<string, number>();
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const cells = splitCsvLine(row, delimiter);
    const waybill = (cells[waybillCol] || "").replace(/\D/g, "");
    const cents = parseMoneyToCents(cells[amountCol] || "");
    if (waybill.length < 8 || cents === null) {
      skipped++;
      continue;
    }
    byWaybill.set(waybill, (byWaybill.get(waybill) ?? 0) + cents);
  }
  return { lines: [...byWaybill].map(([waybill, chargeCents]) => ({ waybill, chargeCents })), skipped };
}
