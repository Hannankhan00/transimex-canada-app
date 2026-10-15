import connectDB from "@/lib/mongoose";
import ExpressSettings, { EXPRESS_SETTINGS_KEY } from "@/models/ExpressSettings";

/** The single settings record, created with a 0% B2C discount on first read. */
export async function getExpressSettings() {
  await connectDB();
  return ExpressSettings.findOneAndUpdate(
    { key: EXPRESS_SETTINGS_KEY },
    { $setOnInsert: { key: EXPRESS_SETTINGS_KEY, b2cDiscountPct: 0 } },
    { upsert: true, returnDocument: "after" }
  ).lean();
}

/** The discount (percent off base freight) every B2C account gets. */
export async function getB2cDiscountPct(): Promise<number> {
  return (await getExpressSettings())?.b2cDiscountPct ?? 0;
}

export interface ExpressPricingSettings {
  b2cDiscountPct: number;
  dhlContractDiscountPct: number | null;
  pickupFeeCents: number;
}

/** Everything the pricing step needs, with defaults for older records. */
export async function getPricingSettings(): Promise<ExpressPricingSettings> {
  const s = await getExpressSettings();
  return {
    b2cDiscountPct: s?.b2cDiscountPct ?? 0,
    dhlContractDiscountPct: s?.dhlContractDiscountPct ?? null,
    pickupFeeCents: s?.pickupFeeCents ?? 0,
  };
}
