import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Invoice from "@/models/Invoice";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await connectDB();
    const invoices = await Invoice.find({
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email.toLowerCase() }],
    })
      .select("-paymentProof.fileData -pdfFile.fileData")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      invoices: invoices.map((i: any) => ({ ...i, id: i._id.toString() })),
    });
  } catch (error: any) {
    console.error("Error fetching client invoices:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch invoices" }, { status: 500 });
  }
}
