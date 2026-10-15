import { hashPassword } from "@/lib/auth";
import User from "@/models/User";
import ExpressAccount, { type IExpressAccount } from "@/models/ExpressAccount";
import ExpressPartnerCustomer, { type IExpressPartnerCustomer } from "@/models/ExpressPartnerCustomer";
import { generateCustomerPassword } from "./partner";

export type LoginResult =
  | { ok: true; created: boolean; email: string; password: string }
  | { ok: false; code: "email_in_use" | "login_missing"; error: string };

/**
 * Gives a partner's customer a login, or sets a new password on the one they
 * already have. The password is returned ONCE for the partner to hand over; only
 * its hash is stored. Resetting signs the customer out everywhere (tokenVersion).
 * An email that already belongs to a Transimex user is refused: a partner can
 * never take over or reset someone else's existing account.
 */
export async function createOrResetCustomerLogin(partner: Pick<IExpressAccount, "language" | "phone" | "country"> & { _id: unknown }, customer: IExpressPartnerCustomer): Promise<LoginResult> {
  const password = generateCustomerPassword();
  const hashed = await hashPassword(password);

  if (customer.loginUserId) {
    const res = await User.updateOne({ _id: customer.loginUserId }, { $set: { password: hashed }, $inc: { tokenVersion: 1 } });
    if (res.matchedCount === 0) return { ok: false, code: "login_missing", error: "This customer's login no longer exists." };
    return { ok: true, created: false, email: customer.email, password };
  }

  if (await User.exists({ email: customer.email })) {
    return { ok: false, code: "email_in_use", error: "This email already has a Transimex account, so a login cannot be created for it. Use a different email." };
  }

  let userId: string;
  try {
    const user = await User.create({
      name: customer.name,
      email: customer.email,
      password: hashed,
      companyName: customer.company || customer.name,
      phone: customer.phone || partner.phone,
      role: "client",
      // The partner vouches for this person, so there is no email verification step.
      isVerified: true,
      isProfileComplete: true,
    });
    userId = String(user._id);
  } catch (error: any) {
    if (error?.code === 11000) return { ok: false, code: "email_in_use", error: "This email already has a Transimex account, so a login cannot be created for it. Use a different email." };
    throw error;
  }

  const account = await ExpressAccount.create({
    userId,
    type: "customer",
    status: customer.archived ? "suspended" : "active",
    language: partner.language,
    contactName: customer.name,
    phone: customer.phone || partner.phone,
    country: partner.country,
    partnerId: String(partner._id),
    partnerCustomerId: String(customer._id),
  });
  await ExpressPartnerCustomer.updateOne({ _id: customer._id }, { $set: { loginUserId: userId, loginAccountId: String(account._id) } });
  return { ok: true, created: true, email: customer.email, password };
}
