import { isValidObjectId } from "mongoose";
import ExpressAccount, { type IExpressAccount } from "@/models/ExpressAccount";
import ExpressPartnerCustomer from "@/models/ExpressPartnerCustomer";
import { effectiveMarkupPct, isActivePartner } from "./partner";

export interface PricingContext {
  ok: true;
  clientDiscountPct: number;
  /** null when the shipment is not for a partner's customer. */
  markupPct: number | null;
  partnerCustomerId: string | null;
  partnerCustomerName: string | null;
}

export interface PricingContextFailure {
  ok: false;
  status: number;
  code: string;
  error: string;
}

const fail = (status: number, code: string, error: string): PricingContextFailure => ({ ok: false, status, code, error });

/**
 * Works out the discount and markup a quote is priced with.
 *  - B2C: the global discount, no markup.
 *  - B2B: its own discount. With a partnerCustomerId (partners only) the customer's markup is added.
 *  - Customer login: the partner's discount plus that customer's markup. The customer cannot choose.
 * Never trusts an id from the caller: the customer must belong to the calling partner.
 */
export async function resolvePricingContext(params: {
  account: Pick<IExpressAccount, "type" | "status" | "discountPct" | "partner" | "partnerId" | "partnerCustomerId"> & { _id: unknown };
  b2cDiscountPct: number;
  requestedCustomerId?: string | null;
}): Promise<PricingContext | PricingContextFailure> {
  const { account, b2cDiscountPct } = params;
  const requested = params.requestedCustomerId || null;
  const incomplete = fail(409, "account_incomplete", "Your account is not fully set up yet. Please contact us.");

  if (account.type === "b2c") {
    if (requested) return fail(403, "not_partner", "Only partner accounts can price for customers.");
    return { ok: true, clientDiscountPct: b2cDiscountPct, markupPct: null, partnerCustomerId: null, partnerCustomerName: null };
  }

  if (account.type === "b2b") {
    if (account.discountPct == null) {
      console.error("[Express] Active B2B account has no discount set:", String(account._id));
      return incomplete;
    }
    if (!requested) {
      return { ok: true, clientDiscountPct: account.discountPct, markupPct: null, partnerCustomerId: null, partnerCustomerName: null };
    }
    if (!isActivePartner(account)) return fail(403, "not_partner", "Only partner accounts can price for customers.");
    if (!isValidObjectId(requested)) return fail(404, "customer_not_found", "Customer not found.");
    const customer = await ExpressPartnerCustomer.findOne({ _id: requested, partnerAccountId: String(account._id), archived: false }).lean();
    if (!customer) return fail(404, "customer_not_found", "Customer not found.");
    return {
      ok: true,
      clientDiscountPct: account.discountPct,
      markupPct: effectiveMarkupPct(account, customer),
      partnerCustomerId: String(customer._id),
      partnerCustomerName: customer.name,
    };
  }

  // A partner's customer with their own login.
  if (requested && requested !== account.partnerCustomerId) return fail(403, "forbidden", "You cannot price for another customer.");
  if (!account.partnerId || !account.partnerCustomerId || !isValidObjectId(account.partnerId) || !isValidObjectId(account.partnerCustomerId)) return incomplete;
  const [partner, customer] = await Promise.all([
    ExpressAccount.findById(account.partnerId).lean<IExpressAccount>(),
    ExpressPartnerCustomer.findById(account.partnerCustomerId).lean(),
  ]);
  if (!partner || !customer || customer.archived || !isActivePartner(partner)) {
    return fail(403, "partner_inactive", "Prices are not available right now. Please contact your shipping partner.");
  }
  if (partner.discountPct == null) return incomplete;
  return {
    ok: true,
    clientDiscountPct: partner.discountPct,
    markupPct: effectiveMarkupPct(partner, customer),
    partnerCustomerId: String(customer._id),
    partnerCustomerName: customer.name,
  };
}
