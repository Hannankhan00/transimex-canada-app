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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireBanksAccess();
    if (access.error) return access.error;

    const { id } = await params;
    await connectDB();
    const bank = await BankAccount.findById(id).lean();
    if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

    return NextResponse.json({ success: true, bank: { ...bank, id: (bank as any)._id.toString() } });
  } catch (error: any) {
    console.error("Error fetching bank account:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch bank account" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireBanksAccess();
    if (access.error) return access.error;

    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const bank = await BankAccount.findById(id);
    if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

    const editableFields = [
      "bankName",
      "beneficiaryName",
      "accountNumber",
      "transitNumber",
      "institutionNumber",
      "swiftBic",
      "bankAddress",
      "currency",
      "isActive",
      "notes",
    ] as const;

    for (const field of editableFields) {
      if (body[field] !== undefined) {
        (bank as any)[field] = body[field];
      }
    }

    if (body.isDefault === true) {
      await BankAccount.updateMany(
        { currency: bank.currency, _id: { $ne: bank._id } },
        { $set: { isDefault: false } }
      );
      bank.isDefault = true;
    } else if (body.isDefault === false) {
      bank.isDefault = false;
    }

    await bank.save();

    await logAudit({
      actor: access.actor,
      action: "BANK_ACCOUNT_UPDATED",
      resourceType: "BankAccount",
      resourceId: bank._id.toString(),
      details: `Bank account "${bank.bankName}" (${bank.currency}) updated.`,
    });

    return NextResponse.json({
      success: true,
      message: `Bank account "${bank.bankName}" updated`,
      bank: { ...bank.toObject(), id: bank._id.toString() },
    });
  } catch (error: any) {
    console.error("Error updating bank account:", error);
    return NextResponse.json({ error: error.message || "Failed to update bank account" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const access = await requireBanksAccess();
    if (access.error) return access.error;

    const { id } = await params;
    await connectDB();
    const bank = await BankAccount.findByIdAndDelete(id);
    if (!bank) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

    await logAudit({
      actor: access.actor,
      action: "BANK_ACCOUNT_DELETED",
      resourceType: "BankAccount",
      resourceId: id,
      details: `Bank account "${bank.bankName}" (${bank.currency}) deleted.`,
    });

    return NextResponse.json({ success: true, message: `Bank account "${bank.bankName}" deleted` });
  } catch (error: any) {
    console.error("Error deleting bank account:", error);
    return NextResponse.json({ error: error.message || "Failed to delete bank account" }, { status: 500 });
  }
}
