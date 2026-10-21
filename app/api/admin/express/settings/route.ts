import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressSettings, { EXPRESS_SETTINGS_KEY } from "@/models/ExpressSettings";
import ExpressDiscountHistory from "@/models/ExpressDiscountHistory";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { getExpressSettings, getPricingSettings } from "@/lib/express/settings";
import { settingsSchema } from "@/lib/express/validation";
import { formatCad } from "@/lib/shipping/core/money";

async function loadView() {
  const [settings, pricing, history] = await Promise.all([
    getExpressSettings(),
    getPricingSettings(),
    ExpressDiscountHistory.find({ scope: "b2c_global" }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  return {
    ...pricing,
    updatedAt: settings?.updatedAt ? new Date(settings.updatedAt).toISOString() : null,
    history: history.map((h) => ({
      id: String(h._id),
      oldPct: h.oldPct,
      newPct: h.newPct,
      changedByName: h.changedByName,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export async function GET() {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;
    await connectDB();
    return NextResponse.json({ success: true, settings: await loadView() });
  } catch (error) {
    console.error("Error loading Express settings:", error);
    return NextResponse.json({ error: "Failed to load Express settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireExpressStaff();
    if (access.error) return access.error;

    const body = await req.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    await connectDB();
    const before = await getPricingSettings();
    const input = parsed.data;

    const next = {
      b2cDiscountPct: input.b2cDiscountPct,
      dhlContractDiscountPct: input.dhlContractDiscountPct === undefined ? before.dhlContractDiscountPct : input.dhlContractDiscountPct,
      documentMaxWeightKg: input.documentMaxWeightKg ?? before.documentMaxWeightKg,
    };

    const changes: string[] = [];
    if (next.b2cDiscountPct !== before.b2cDiscountPct) changes.push(`B2C discount ${before.b2cDiscountPct}% -> ${next.b2cDiscountPct}%`);
    if (next.dhlContractDiscountPct !== before.dhlContractDiscountPct) {
      changes.push(`DHL contract discount ${before.dhlContractDiscountPct ?? "unset"}% -> ${next.dhlContractDiscountPct ?? "unset"}%`);
    }

    if (next.documentMaxWeightKg !== before.documentMaxWeightKg) {
      changes.push(`document weight limit ${before.documentMaxWeightKg} kg -> ${next.documentMaxWeightKg} kg`);
    }

    if (changes.length > 0) {
      await ExpressSettings.updateOne(
        { key: EXPRESS_SETTINGS_KEY },
        { $set: { ...next, updatedBy: access.actor.userId } },
        { runValidators: true }
      );
      if (next.b2cDiscountPct !== before.b2cDiscountPct) {
        await ExpressDiscountHistory.create({
          scope: "b2c_global",
          accountId: "",
          oldPct: before.b2cDiscountPct,
          newPct: next.b2cDiscountPct,
          changedBy: access.actor.userId,
          changedByName: access.actor.name,
        });
      }
      await logAudit({
        actor: access.actor,
        action: "EXPRESS_SETTINGS_CHANGED",
        resourceType: "ExpressSettings",
        resourceId: EXPRESS_SETTINGS_KEY,
        details: changes.join("; "),
      });
    }

    return NextResponse.json({ success: true, settings: await loadView() });
  } catch (error) {
    console.error("Error saving Express settings:", error);
    return NextResponse.json({ error: "Failed to save Express settings" }, { status: 500 });
  }
}
