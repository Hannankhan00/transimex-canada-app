import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Inquiry, { InquiryCategory } from "@/models/Inquiry";

const VALID_CATEGORIES: InquiryCategory[] = [
  "General Inquiry",
  "Freight Quote",
  "Partnership",
  "Customs Clearance",
];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, company, subject, category, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "name, email, subject, and message are required" },
        { status: 400 }
      );
    }

    const resolvedCategory: InquiryCategory = VALID_CATEGORIES.includes(category)
      ? category
      : "General Inquiry";

    await connectDB();
    const inquiry = await Inquiry.create({
      name,
      email,
      phone: phone || "",
      company: company || "",
      subject,
      category: resolvedCategory,
      message,
      unread: true,
      replied: false,
    });

    return NextResponse.json({ success: true, id: inquiry._id.toString() });
  } catch (error: any) {
    console.error("Error creating inquiry:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}
