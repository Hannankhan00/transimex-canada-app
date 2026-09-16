import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import BankAccount from "@/models/BankAccount";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { hasModulePermission } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

async function requireBanksAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const actor = verifyToken(token);
  if (!actor) {
    return { error: NextResponse.json({ error: "Invalid session token" }, { status: 401 }) };
  }

  await connectDB();
  const actorUser = await User.findById(actor.userId).lean<any>();
  if (!actorUser || !hasModulePermission(actorUser, "settings")) {
    return {
      error: NextResponse.json(
        { error: "Forbidden: You do not have permission to manage company bank accounts." },
        { status: 403 }
      ),
    };
  }

  return { actor, actorUser };
}

export async function GET() {
  try {
    const access = await requireBanksAccess();
    if (access.error) return access.error;

    await connectDB();
    const banks = await BankAccount.find().sort({ currency: 1, isDefault: -1, createdAt: -1 }).lean();

    return NextResponse.json({
      success: true,
      banks: banks.map((b: any) => ({ ...b, id: b._id.toString() })),
    });
  } catch (error: any) {
    console.error("Error fetching bank accounts:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch bank accounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const access = await requireBanksAccess();
    if (access.error) return access.error;

    const body = await req.json();
    const {
      bankName,
      beneficiaryName,
      accountNumber,
      transitNumber,
      institutionNumber,
      swiftBic,
      bankAddress,
      currency,
      isDefault,
      isActive,
      notes,
    } = body;

    if (!bankName || !beneficiaryName || !accountNumber || !currency) {
      return NextResponse.json(
        { error: "Bank name, beneficiary name, account number, and currency are required" },
        { status: 400 }
      );
    }

    await connectDB();

    if (isDefault) {
      await BankAccount.updateMany({ currency }, { $set: { isDefault: false } });
    }

    const bank = await BankAccount.create({
      bankName,
      beneficiaryName,
      accountNumber,
      transitNumber: transitNumber || "",
      institutionNumber: institutionNumber || "",
      swiftBic: swiftBic || "",
      bankAddress: bankAddress || "",
      currency,
      isDefault: Boolean(isDefault),
      isActive: isActive !== false,
      notes: notes || "",
    });

    await logAudit({
      actor: access.actor,
      action: "BANK_ACCOUNT_CREATED",
      resourceType: "BankAccount",
      resourceId: bank._id.toString(),
      details: `Bank account "${bankName}" (${currency}) added${isDefault ? " and set as default" : ""}.`,
    });

    return NextResponse.json({
      success: true,
      message: `Bank account "${bankName}" created`,
      bank: { ...bank.toObject(), id: bank._id.toString() },
    });
  } catch (error: any) {
    console.error("Error creating bank account:", error);
    return NextResponse.json({ error: error.message || "Failed to create bank account" }, { status: 500 });
  }
}
