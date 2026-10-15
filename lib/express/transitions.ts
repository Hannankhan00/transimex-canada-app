import type { ExpressAccountStatus, ExpressAccountType } from "@/models/ExpressAccount";

export type ExpressAction = "approve" | "reject" | "suspend" | "reactivate" | "update";

/** Which statuses each staff action may start from, per account type. */
const ALLOWED: Record<ExpressAction, { from: ExpressAccountStatus[]; types: ExpressAccountType[]; to?: ExpressAccountStatus }> = {
  // A rejected B2B application may be approved later if staff change their mind.
  approve: { from: ["pending", "rejected"], types: ["b2b"], to: "active" },
  reject: { from: ["pending"], types: ["b2b"], to: "rejected" },
  suspend: { from: ["active"], types: ["b2b", "b2c"], to: "suspended" },
  reactivate: { from: ["suspended"], types: ["b2b", "b2c"], to: "active" },
  update: { from: ["active", "suspended"], types: ["b2b"] },
};

export function checkTransition(
  account: { type: ExpressAccountType; status: ExpressAccountStatus },
  action: ExpressAction
): { ok: true; to: ExpressAccountStatus } | { ok: false; error: string } {
  const rule = ALLOWED[action];
  if (!rule.types.includes(account.type)) {
    return { ok: false, error: `A ${account.type.toUpperCase()} account cannot be ${action}d.` };
  }
  if (!rule.from.includes(account.status)) {
    return { ok: false, error: `Cannot ${action} an account that is ${account.status}.` };
  }
  return { ok: true, to: rule.to ?? account.status };
}

/** Only an active account may use Express (quotes, booking). Pending B2B waits. */
export function canUseExpress(account: { status: ExpressAccountStatus } | null | undefined): boolean {
  return account?.status === "active";
}
