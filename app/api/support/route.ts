import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import { getCurrentUser } from "@/lib/session";

function mapTicket(t: any) {
  return {
    id: t.ticketId,
    ticketId: t.ticketId,
    client: t.client,
    subject: t.subject,
    category: t.category,
    linkedShipmentId: t.shipmentId || "",
    shipmentId: t.shipmentId || "",
    priority: t.priority,
    message: t.messages?.[0]?.message || "",
    status: t.status,
    statusFr: t.status === "Open" ? "Ouvert" : t.status === "In Progress" ? "En Cours" : "Résolu",
    createdAt: new Date(t.createdAt).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    updatedAt: new Date(t.updatedAt).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    assignedAgent: "Transimex Dispatch Support Desk",
    messages: t.messages,
    responses: (t.messages || []).map((m: any) => ({
      id: `${t.ticketId}-${m.timestamp}`,
      sender: m.sender === "admin" ? m.senderName : "Client (You)",
      role: m.sender === "admin" ? "agent" : "client",
      message: m.message,
      time: m.timestamp,
    })),
  };
}

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    await connectDB();
    const tickets = await SupportTicket.find({
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      tickets: tickets.map(mapTicket),
    });
  } catch (error: any) {
    console.error("Error fetching client support tickets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch support tickets" },
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
    const { subject, category, linkedShipmentId, priority, message } = body;

    if (!subject || !category || !priority || !message) {
      return NextResponse.json(
        { error: "Subject, category, priority, and message are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(currentUser.userId).lean<any>();
    const ticketId = `SUP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const clientName = user?.name || currentUser.name;

    const ticket = await SupportTicket.create({
      ticketId,
      client: {
        name: clientName,
        companyName: user?.companyName || currentUser.companyName,
        email: user?.email || currentUser.email,
        userId: currentUser.userId,
      },
      subject,
      category,
      shipmentId: linkedShipmentId || "",
      priority,
      status: "Open",
      messages: [
        {
          sender: "client",
          senderName: clientName,
          message,
          timestamp: now,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      message: `Support ticket ${ticketId} opened`,
      ticket: mapTicket(ticket.toObject()),
    });
  } catch (error: any) {
    console.error("Error creating support ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create support ticket" },
      { status: 500 }
    );
  }
}
