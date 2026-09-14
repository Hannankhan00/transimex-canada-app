import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Inquiry from "@/models/Inquiry";
import { toContactInquiry } from "@/lib/inquiryTypes";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status"); // "unread", "read", "all"
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();
    const docs = await Inquiry.find({}).sort({ createdAt: -1 }).lean();

    let inquiries = docs.map(toContactInquiry);

    if (category && category !== "all") {
      inquiries = inquiries.filter(
        (inq) => inq.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (status === "unread") {
      inquiries = inquiries.filter((inq) => inq.unread === true);
    } else if (status === "read") {
      inquiries = inquiries.filter((inq) => inq.unread === false);
    }

    if (search) {
      inquiries = inquiries.filter(
        (inq) =>
          inq.name.toLowerCase().includes(search) ||
          inq.email.toLowerCase().includes(search) ||
          inq.company.toLowerCase().includes(search) ||
          inq.subject.toLowerCase().includes(search) ||
          inq.message.toLowerCase().includes(search)
      );
    }

    const allInquiries = docs.map(toContactInquiry);

    // Real average first-response time, computed from actual reply timestamps
    // rather than presented as a fixed placeholder.
    const responseTimesMs: number[] = [];
    for (const doc of docs as any[]) {
      if (doc.reply?.repliedAt && doc.createdAt) {
        responseTimesMs.push(
          new Date(doc.reply.repliedAt).getTime() - new Date(doc.createdAt).getTime()
        );
      }
    }
    const avgResponseMinutes =
      responseTimesMs.length > 0
        ? Math.round(responseTimesMs.reduce((sum, ms) => sum + ms, 0) / responseTimesMs.length / 60000)
        : null;

    const counts = {
      all: allInquiries.length,
      unread: allInquiries.filter((inq) => inq.unread).length,
      read: allInquiries.filter((inq) => !inq.unread).length,
      replied: allInquiries.filter((inq) => inq.replied).length,
      avgResponseMinutes,
    };

    return NextResponse.json({
      success: true,
      inquiries,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
