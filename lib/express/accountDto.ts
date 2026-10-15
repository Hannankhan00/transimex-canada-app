import type { IExpressAccount } from "@/models/ExpressAccount";

const iso = (d: unknown): string | null => {
  if (!d) return null;
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

type Doc = Omit<Partial<IExpressAccount>, "_id"> & { _id: unknown };

/**
 * What the account owner sees. No staff identifiers. The rejection or
 * suspension reason is shown only while it applies.
 */
export function toClientAccountDTO(doc: Doc) {
  return {
    id: String(doc._id),
    type: doc.type!,
    status: doc.status!,
    contactName: doc.contactName || "",
    phone: doc.phone || "",
    country: doc.country || "",
    company: doc.company
      ? {
          name: doc.company.name,
          address: doc.company.address,
          contactPerson: doc.company.contactPerson,
          businessType: doc.company.businessType,
          expectedMonthlyVolume: doc.company.expectedMonthlyVolume,
        }
      : null,
    discountPct: doc.type === "b2b" && doc.status !== "pending" ? (doc.discountPct ?? null) : null,
    // Only a switched-on partner sees the partner area; customers never see markup settings.
    partner: doc.type === "b2b" && doc.partner?.enabled ? { enabled: true, defaultMarkupPct: doc.partner.defaultMarkupPct ?? 0 } : null,
    billingModes: doc.status === "pending" ? [] : (doc.billingModes ?? []),
    creditLimitCents: doc.status === "pending" ? null : (doc.creditLimitCents ?? null),
    paymentTermsDays: doc.status === "pending" ? null : (doc.paymentTermsDays ?? null),
    rejectionReason: doc.status === "rejected" ? doc.rejectionReason || "" : "",
    suspensionReason: doc.status === "suspended" ? doc.suspensionReason || "" : "",
    termsVersion: doc.terms?.version || "",
    termsAcceptedAt: iso(doc.terms?.acceptedAt),
    createdAt: iso(doc.createdAt),
  };
}

export type ClientAccountDTO = ReturnType<typeof toClientAccountDTO>;

export interface AccountUserInfo {
  name?: string;
  email?: string;
  companyName?: string;
}

/** Full view for staff, with the CRM user's identity attached. */
export function toAdminAccountDTO(doc: Doc, user?: AccountUserInfo | null) {
  return {
    ...toClientAccountDTO(doc),
    // Staff always see the stored reason and terms regardless of status.
    discountPct: doc.discountPct ?? null,
    billingModes: doc.billingModes ?? [],
    creditLimitCents: doc.creditLimitCents ?? null,
    paymentTermsDays: doc.paymentTermsDays ?? null,
    rejectionReason: doc.rejectionReason || "",
    suspensionReason: doc.suspensionReason || "",
    language: doc.language || "en",
    partnerSettings: { enabled: Boolean(doc.partner?.enabled), defaultMarkupPct: doc.partner?.defaultMarkupPct ?? 0, enabledAt: iso(doc.partner?.enabledAt) },
    // What the business said it ships and for whom. Staff only: the client does not need it back.
    shippingProfile: doc.shippingProfile
      ? {
          categories: doc.shippingProfile.categories ?? [],
          goodsDescription: doc.shippingProfile.goodsDescription,
          shipsFor: doc.shippingProfile.shipsFor,
          clientCount: doc.shippingProfile.clientCount ?? null,
          clientsDescription: doc.shippingProfile.clientsDescription ?? "",
          destinations: doc.shippingProfile.destinations,
          typicalWeight: doc.shippingProfile.typicalWeight,
          typicalValue: doc.shippingProfile.typicalValue,
          restrictedGoods: doc.shippingProfile.restrictedGoods ?? [],
          currentCarriers: doc.shippingProfile.currentCarriers ?? "",
          paymentPreference: doc.shippingProfile.paymentPreference,
          businessNumber: doc.shippingProfile.businessNumber ?? "",
          website: doc.shippingProfile.website ?? "",
        }
      : null,
    userId: doc.userId || "",
    reviewedBy: doc.reviewedBy || "",
    reviewedAt: iso(doc.reviewedAt),
    user: {
      name: user?.name || "",
      email: user?.email || "",
      companyName: user?.companyName || "",
    },
  };
}

export type AdminAccountDTO = ReturnType<typeof toAdminAccountDTO>;
