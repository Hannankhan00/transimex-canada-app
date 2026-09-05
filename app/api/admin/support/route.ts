import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import SupportTicket from "@/models/SupportTicket";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("q")?.toLowerCase() || "";

    await connectDB();
    const dbTickets = await SupportTicket.find().sort({ createdAt: -1 }).lean();

    let tickets = dbTickets.map((dt: any) => ({
      id: dt._id.toString(),
      ticketId: dt.ticketId,
      client: {
        name: dt.client.name,
        companyName: dt.client.companyName,
        email: dt.client.email,
      },
      subject: dt.subject,
      shipmentId: dt.shipmentId || "",
      priority: dt.priority,
      message: dt.subject,
      status: dt.status,
      category: dt.category || "Operations",
      createdAt: dt.createdAt ? new Date(dt.createdAt).toLocaleString() : "",
      updatedAt: dt.updatedAt ? new Date(dt.updatedAt).toLocaleString() : "",
      messages: (dt.messages || []).map((m: any, idx: number) => ({
        id: `MSG-${idx}`,
        sender: m.sender,
        senderName: m.senderName,
        message: m.message,
        timestamp: m.timestamp,
        isInternal: m.isInternal,
      })),
      internalNotes: dt.internalNotes || "",
    }));

    const allTickets = tickets;

    if (status && status !== "all") {
      tickets = tickets.filter(
        (t) => t.status.toLowerCase() === status.toLowerCase()
      );
    }

    if (priority && priority !== "all") {
      tickets = tickets.filter(
        (t) => t.priority.toLowerCase() === priority.toLowerCase()
      );
    }

    if (search) {
      tickets = tickets.filter((t) => {
        const ticketRef = (t.ticketId || t.id).toLowerCase();
        const clientName = (t.client?.name || "").toLowerCase();
        const company = (t.client?.companyName || "").toLowerCase();
        const shipment = (t.shipmentId || "").toLowerCase();

        return (
          ticketRef.includes(search) ||
          t.subject.toLowerCase().includes(search) ||
          clientName.includes(search) ||
          company.includes(search) ||
          shipment.includes(search)
        );
      });
    }

    const counts = {
      all: allTickets.length,
      open: allTickets.filter((t) => t.status === "Open").length,
      in_progress: allTickets.filter((t) => t.status === "In Progress").length,
      resolved: allTickets.filter((t) => t.status === "Resolved").length,
      urgent: allTickets.filter((t) => t.priority === "Urgent" || t.priority === "Critical Dispatch Emergency").length,
    };

    return NextResponse.json({
      success: true,
      tickets,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
