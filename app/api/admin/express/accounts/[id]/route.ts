import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount, { type IExpressAccount } from "@/models/ExpressAccount";
import ExpressDiscountHistory from "@/models/ExpressDiscountHistory";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { toAdminAccountDTO } from "@/lib/express/accountDto";
import { checkTransition } from "@/lib/express/transitions";
import { accountActionSchema, type B2bTermsInput } from "@/lib/express/validation";
import { sendExpressDecisionEmail, type ExpressDecision } from "@/lib/expressEmail";
import { formatCad } from "@/lib/shipping/core/money";
import { creditSummary } from "@/lib/express/credit";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Express account not found" }, { status: 404 });

const modesLabel = (modes: string[]) => modes.map((m) => (m === "invoice" ? "weekly invoice" : "pay at booking")).join(" + ") || "none";

function describeTerms(t: { discountPct: number | null; billingModes: string[]; creditLimitCents: number | null; paymentTermsDays: number | null }) {
  const parts = [`discount ${t.discountPct ?? "none"}%`, `billing ${modesLabel(t.billingModes)}`];
  if (t.billingModes.includes("invoice")) {
    parts.push(`credit limit ${t.creditLimitCents != null ? formatCad(t.creditLimitCents) : "none"}`);
    parts.push(`terms ${t.paymentTermsDays ?? "none"} days`);
  }
  return parts.join(", ");
}

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    await connectDB();
    const doc = await ExpressAccount.findById(id).lean();
    if (!doc) return notFound();

    const [user, history] = await Promise.all([
      isValidObjectId(doc.userId) ? User.findById(doc.userId).select("name email companyName").lean<any>() : null,
      ExpressDiscountHistory.find({ scope: "b2b_account", accountId: id }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return NextResponse.json({
      success: true,
      account: toAdminAccountDTO(doc, user),
      credit: doc.type === "b2b" && doc.billingModes?.includes("invoice") ? await creditSummary(doc) : null,
      discountHistory: history.map((h) => ({
        id: String(h._id),
        oldPct: h.oldPct,
        newPct: h.newPct,
        changedByName: h.changedByName,
        createdAt: h.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching Express account:", error);
    return NextResponse.json({ error: "Failed to load Express account" }, { status: 500 });
  }
}

/** Approve, reject, suspend, reactivate or edit an account. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    const actor = access.actor;

    const { id } = await params;
    if (!isValidObjectId(id)) return notFound();

    const body = await req.json().catch(() => null);
    const parsed = accountActionSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const input = parsed.data;

    await connectDB();
    const account = await ExpressAccount.findById(id).lean<IExpressAccount>();
    if (!account) return notFound();

    const transition = checkTransition(account, input.action);
    if (!transition.ok) return NextResponse.json({ error: transition.error }, { status: 409 });

    // Switching partner mode is not a review decision: it must not overwrite who reviewed the account.
    if (input.action === "partner") {
      const was = account.partner;
      const updatedPartner = await ExpressAccount.findOneAndUpdate(
        { _id: id, status: account.status },
        {
          $set: {
            partner: {
              enabled: input.partner.enabled,
              defaultMarkupPct: input.partner.defaultMarkupPct,
              enabledAt: input.partner.enabled && !was?.enabled ? new Date() : was?.enabledAt,
              enabledBy: input.partner.enabled && !was?.enabled ? actor.userId : was?.enabledBy,
            },
          },
        },
        { returnDocument: "after", runValidators: true }
      ).lean<IExpressAccount>();
      if (!updatedPartner) {
        return NextResponse.json({ error: "This account was just changed by someone else. Reload and try again." }, { status: 409 });
      }
      await logAudit({
        actor,
        action: "EXPRESS_PARTNER_CHANGED",
        resourceType: "ExpressAccount",
        resourceId: id,
        details: `${account.company?.name || account.contactName}: partner ${was?.enabled ? "on" : "off"} (${was?.defaultMarkupPct ?? 0}%) -> ${input.partner.enabled ? "on" : "off"} (${input.partner.defaultMarkupPct}%)`,
      });
      const owner = isValidObjectId(account.userId) ? await User.findById(account.userId).select("name email companyName").lean<any>() : null;
      return NextResponse.json({ success: true, account: toAdminAccountDTO(updatedPartner, owner) });
    }

    const set: Record<string, unknown> = {
      status: transition.to,
      reviewedBy: actor.userId,
      reviewedAt: new Date(),
    };
    const unset: Record<string, ""> = {};
    let terms: B2bTermsInput | null = null;

    switch (input.action) {
      case "approve":
      case "update":
        terms = input.terms;
        Object.assign(set, terms);
        if (input.action === "approve") {
          unset.rejectionReason = "";
          unset.suspensionReason = "";
        }
        break;
      case "reject":
        set.rejectionReason = input.reason;
        break;
      case "suspend":
        set.suspensionReason = input.reason;
        break;
      case "reactivate":
        unset.suspensionReason = "";
        break;
    }

    // Guard against two staff acting at once: only apply if the status is unchanged.
    const updated = await ExpressAccount.findOneAndUpdate(
      { _id: id, status: account.status },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: "after", runValidators: true }
    ).lean<IExpressAccount>();
    if (!updated) {
      return NextResponse.json({ error: "This account was just changed by someone else. Reload and try again." }, { status: 409 });
    }

    const label = account.company?.name || account.contactName;
    const resource = { resourceType: "ExpressAccount" as const, resourceId: id };

    // Discount history and audit trail.
    const discountChanged = terms !== null && terms.discountPct !== account.discountPct;
    if (discountChanged && terms) {
      await ExpressDiscountHistory.create({
        scope: "b2b_account",
        accountId: id,
        oldPct: account.discountPct,
        newPct: terms.discountPct,
        changedBy: actor.userId,
        changedByName: actor.name,
      });
    }

    if (input.action === "approve" && terms) {
      await logAudit({ actor, action: "EXPRESS_ACCOUNT_APPROVED", ...resource, details: `Approved ${label}: ${describeTerms(terms)}` });
    } else if (input.action === "reject") {
      await logAudit({ actor, action: "EXPRESS_ACCOUNT_REJECTED", ...resource, details: `Rejected ${label}: ${input.reason}` });
    } else if (input.action === "suspend") {
      await logAudit({ actor, action: "EXPRESS_ACCOUNT_SUSPENDED", ...resource, details: `Suspended ${label}: ${input.reason}` });
    } else if (input.action === "reactivate") {
      await logAudit({ actor, action: "EXPRESS_ACCOUNT_REACTIVATED", ...resource, details: `Reactivated ${label}` });
    } else if (input.action === "update" && terms) {
      if (discountChanged) {
        await logAudit({
          actor,
          action: "EXPRESS_DISCOUNT_CHANGED",
          ...resource,
          details: `${label}: discount ${account.discountPct ?? "none"}% -> ${terms.discountPct}%`,
        });
      }
      const billingChanged =
        modesLabel(account.billingModes) !== modesLabel(terms.billingModes) ||
        (account.creditLimitCents ?? null) !== terms.creditLimitCents ||
        (account.paymentTermsDays ?? null) !== terms.paymentTermsDays;
      if (billingChanged) {
        await logAudit({
          actor,
          action: "EXPRESS_BILLING_MODE_CHANGED",
          ...resource,
          details: `${label}: ${describeTerms(account)} -> ${describeTerms(terms)}`,
        });
      }
    }

    // Tell the client about the decision (best effort).
    const decision: ExpressDecision | null =
      input.action === "approve" ? "approved"
      : input.action === "reject" ? "rejected"
      : input.action === "suspend" ? "suspended"
      : input.action === "reactivate" ? "reactivated"
      : null;

    const user = isValidObjectId(account.userId)
      ? await User.findById(account.userId).select("name email companyName").lean<any>()
      : null;

    if (decision && user?.email) {
      const reason = input.action === "reject" || input.action === "suspend" ? input.reason : undefined;
      sendExpressDecisionEmail({
        to: user.email,
        name: account.contactName || user.name,
        language: account.language,
        decision,
        reason,
      }).catch((err) => console.warn("[Express] Decision email failed:", err));

      const titles: Record<ExpressDecision, { en: string; fr: string }> = {
        approved: { en: "Express account approved", fr: "Compte Express approuvé" },
        rejected: { en: "Express application not approved", fr: "Demande Express non approuvée" },
        suspended: { en: "Express account suspended", fr: "Compte Express suspendu" },
        reactivated: { en: "Express account reactivated", fr: "Compte Express réactivé" },
      };
      await notifyUser({
        userId: account.userId,
        title: titles[decision].en,
        titleFr: titles[decision].fr,
        desc: reason || titles[decision].en,
        descFr: reason || titles[decision].fr,
        category: "system",
        link: "/express",
      });
    }

    return NextResponse.json({ success: true, account: toAdminAccountDTO(updated, user) });
  } catch (error) {
    console.error("Error updating Express account:", error);
    return NextResponse.json({ error: "Failed to update Express account" }, { status: 500 });
  }
}
