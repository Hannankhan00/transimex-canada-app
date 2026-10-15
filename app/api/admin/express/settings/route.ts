import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import ExpressSettings, { EXPRESS_SETTINGS_KEY } from "@/models/ExpressSettings";
import ExpressDiscountHistory from "@/models/ExpressDiscountHistory";
import { logAudit } from "@/lib/audit";
import { requireExpressStaff, validationError } from "@/lib/express/access";
import { getExpressSettings } from "@/lib/express/settings";
import { settingsSchema } from "@/lib/express/validation";

async function loadView() {
  const [settings, history] = await Promise.all([
    getExpressSettings(),
    ExpressDiscountHistory.find({ scope: "b2c_global" }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  return {
    b2cDiscountPct: settings?.b2cDiscountPct ?? 0,
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
    const current = await getExpressSettings();
    const oldPct = current?.b2cDiscountPct ?? 0;
    const newPct = parsed.data.b2cDiscountPct;

    if (oldPct !== newPct) {
      await ExpressSettings.updateOne(
        { key: EXPRESS_SETTINGS_KEY },
        { $set: { b2cDiscountPct: newPct, updatedBy: access.actor.userId } },
        { runValidators: true }
      );
      await ExpressDiscountHistory.create({
        scope: "b2c_global",
        accountId: "",
        oldPct,
        newPct,
        changedBy: access.actor.userId,
        changedByName: access.actor.name,
      });
      await logAudit({
        actor: access.actor,
        action: "EXPRESS_SETTINGS_CHANGED",
        resourceType: "ExpressSettings",
        resourceId: EXPRESS_SETTINGS_KEY,
        details: `B2C discount ${oldPct}% -> ${newPct}%`,
      });
    }

    return NextResponse.json({ success: true, settings: await loadView() });
  } catch (error) {
    console.error("Error saving Express settings:", error);
    return NextResponse.json({ error: "Failed to save Express settings" }, { status: 500 });
  }
}
