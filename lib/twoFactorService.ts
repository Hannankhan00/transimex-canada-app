import User from "@/models/User";
import { consumeRecoveryCode, decryptSecret, verifyTotp } from "@/lib/twoFactor";

export const TWO_FA_SELECT = "+twoFactorSecret +twoFactorPendingSecret +twoFactorRecoveryCodes +twoFactorLastStep";

/**
 * Checks a code against a user's enabled 2FA. Accepts an authenticator code or a one-time recovery code.
 * A TOTP step can only be used once (replay protection) and a recovery code is consumed on use.
 * The user must have been loaded with TWO_FA_SELECT.
 */
export async function checkSecondFactor(
  user: any,
  code: string
): Promise<{ ok: boolean; usedRecoveryCode?: boolean; recoveryLeft?: number }> {
  if (!user.twoFactorEnabled || !user.twoFactorSecret) return { ok: false };

  const step = verifyTotp(decryptSecret(user.twoFactorSecret), code);
  if (step !== null) {
    // Atomic compare-and-set so two parallel requests can not both spend the same code.
    const res = await User.updateOne(
      {
        _id: user._id,
        $or: [{ twoFactorLastStep: { $lt: step } }, { twoFactorLastStep: { $exists: false } }, { twoFactorLastStep: null }],
      },
      { $set: { twoFactorLastStep: step } }
    );
    return { ok: res.modifiedCount === 1 };
  }

  const stored: string[] = user.twoFactorRecoveryCodes || [];
  const remaining = consumeRecoveryCode(stored, code);
  if (remaining) {
    const spent = stored.find((h) => !remaining.includes(h))!;
    // Pull exactly the spent hash; if a parallel request already did, nothing is modified and we refuse.
    const res = await User.updateOne(
      { _id: user._id, twoFactorRecoveryCodes: spent },
      { $pull: { twoFactorRecoveryCodes: spent } }
    );
    return { ok: res.modifiedCount === 1, usedRecoveryCode: true, recoveryLeft: remaining.length };
  }
  return { ok: false };
}
