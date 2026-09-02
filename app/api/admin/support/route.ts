import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import SupportTicket from "@/models/SupportTicket";
import { getStoredTickets, SupportTicketItem } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("q")?.toLowerCase() || "";

    let tickets: SupportTicketItem[] = getStoredTickets();

    // Check DB if tickets exist
    try {
      await connectDB();
      const dbTickets = await SupportTicket.find().lean();
      if (dbTickets && dbTickets.length > 0) {
        for (const dt of dbTickets) {
          if (!tickets.find((t) => t.ticketId === dt.ticketId)) {
            tickets.unshift({
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
              createdAt: dt.createdAt ? new Date(dt.createdAt).toLocaleString() : "Recent",
              updatedAt: dt.updatedAt ? new Date(dt.updatedAt).toLocaleString() : "Recent",
              messages: (dt.messages || []).map((m: any, idx: number) => ({
                id: `MSG-${idx}`,
                sender: m.sender,
                senderName: m.senderName,
                message: m.message,
                timestamp: m.timestamp,
                isInternal: m.isInternal,
              })),
              internalNotes: dt.internalNotes || "",
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("[Admin Support API] DB fetch fallback:", dbErr);
    }

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
        const shipment = (t.shipmentId || t.linkedShipmentId || "").toLowerCase();

        return (
          ticketRef.includes(search) ||
          t.subject.toLowerCase().includes(search) ||
          clientName.includes(search) ||
          company.includes(search) ||
          shipment.includes(search)
        );
      });
    }

    const allTickets = getStoredTickets();
    const counts = {
      all: allTickets.length,
      open: allTickets.filter((t) => t.status === "Open").length,
      in_progress: allTickets.filter((t) => t.status === "In Progress").length,
      resolved: allTickets.filter((t) => t.status === "Resolved").length,
      urgent: allTickets.filter((t) => (t.priority as string) === "Urgent" || (t.priority as string) === "Critical Dispatch Emergency").length,
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
