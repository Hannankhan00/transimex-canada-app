import { NextResponse } from "next/server";
import { getStoredInquiries, ContactInquiry } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const status = searchParams.get("status"); // "unread", "read", "all"
    const search = searchParams.get("q")?.toLowerCase() || "";

    let inquiries: ContactInquiry[] = getStoredInquiries();

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

    const allInquiries = getStoredInquiries();
    const counts = {
      all: allInquiries.length,
      unread: allInquiries.filter((inq) => inq.unread).length,
      read: allInquiries.filter((inq) => !inq.unread).length,
      replied: allInquiries.filter((inq) => inq.replied).length,
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
