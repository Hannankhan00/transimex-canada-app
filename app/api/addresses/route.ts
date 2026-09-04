import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Address from "@/models/Address";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const addresses = await Address.find({ userId: currentUser.userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      addresses: addresses.map((a: any) => ({ ...a, id: a._id.toString() })),
    });
  } catch (error: any) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { alias, company, contactPerson, phone, street, city, province, postalCode, country, accessInstructions, isDefault } = body;

    if (!alias || !company || !contactPerson || !phone || !street || !city || !province || !postalCode) {
      return NextResponse.json({ error: "All address fields are required" }, { status: 400 });
    }

    await connectDB();

    if (isDefault) {
      await Address.updateMany({ userId: currentUser.userId }, { $set: { isDefault: false } });
    }

    const address = await Address.create({
      userId: currentUser.userId,
      alias,
      company,
      contactPerson,
      phone,
      street,
      city,
      province,
      postalCode,
      country: country || "Canada",
      accessInstructions: accessInstructions || "",
      isDefault: !!isDefault,
    });

    const obj: any = address.toObject();
    return NextResponse.json({
      success: true,
      address: { ...obj, id: obj._id.toString() },
    });
  } catch (error: any) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create address" },
      { status: 500 }
    );
  }
}
