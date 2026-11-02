import { z } from "zod";

/** Where a partner wants to be paid. Either an Interac e-Transfer email or a Canadian bank account. */
export const payoutDetailsSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("etransfer"),
    email: z.string({ required_error: "Enter the e-Transfer email" }).trim().toLowerCase().email("Enter a valid email").max(160),
  }),
  z.object({
    method: z.literal("bank"),
    accountHolder: z.string({ required_error: "Enter the account holder's name" }).trim().min(2, "Enter the account holder's name").max(120),
    institution: z.string().trim().regex(/^\d{3}$/, "The institution number is 3 digits"),
    transit: z.string().trim().regex(/^\d{5}$/, "The transit number is 5 digits"),
    accountNumber: z.string().trim().regex(/^\d{7,12}$/, "The account number is 7 to 12 digits"),
  }),
]);

export type PayoutDetails = z.infer<typeof payoutDetailsSchema>;

/** A version safe to show on screen and in lists: enough to recognise, never enough to use. */
export function maskPayoutDetails(details: PayoutDetails): string {
  if (details.method === "etransfer") {
    const [user, domain] = details.email.split("@");
    return `Interac e-Transfer · ${user.slice(0, 1)}***@${domain}`;
  }
  return `Bank account · ${details.accountHolder} · ····${details.accountNumber.slice(-4)}`;
}

export const payoutRequestSchema = z.object({
  /** Dollars as typed, converted to whole cents here. */
  amount: z
    .number({ invalid_type_error: "Enter an amount" })
    .positive("Enter an amount above zero")
    .max(1_000_000, "Amount is too large")
    .transform((v) => Math.round(v * 100)),
});

export const collectionSchema = z.object({ collection: z.enum(["stripe", "transimex"]) });

export const payoutResolveSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("paid"), reference: z.string({ required_error: "Enter the transfer reference" }).trim().min(3, "Enter the transfer reference").max(120) }),
  z.object({ action: z.literal("reject"), reason: z.string({ required_error: "Enter a reason" }).trim().min(3, "Enter a reason").max(300) }),
]);
