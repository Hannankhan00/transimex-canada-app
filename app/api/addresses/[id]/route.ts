import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Address from "@/models/Address";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    await connectDB();
    const address = await Address.findOne({ _id: id, userId: currentUser.userId });
    if (!address) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    if (body.isDefault) {
      await Address.updateMany({ userId: currentUser.userId }, { $set: { isDefault: false } });
    }

    const fields = [
      "alias",
      "company",
      "contactPerson",
      "phone",
      "street",
      "city",
      "province",
      "postalCode",
      "country",
      "accessInstructions",
      "isDefault",
    ] as const;
    for (const field of fields) {
      if (body[field] !== undefined) {
        (address as any)[field] = body[field];
      }
    }
    await address.save();

    const obj: any = address.toObject();
    return NextResponse.json({
      success: true,
      address: { ...obj, id: obj._id.toString() },
    });
  } catch (error: any) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update address" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await connectDB();
    const result = await Address.deleteOne({ _id: id, userId: currentUser.userId });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete address" },
      { status: 500 }
    );
  }
}
