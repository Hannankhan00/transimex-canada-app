import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
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
    const { message } = await req.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await connectDB();
    const ticket = await SupportTicket.findOne({
      ticketId: id,
      $or: [{ "client.userId": currentUser.userId }, { "client.email": currentUser.email }],
    });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found" }, { status: 404 });
    }

    const user = await User.findById(currentUser.userId).lean<any>();
    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    ticket.messages.push({
      sender: "client",
      senderName: user?.name || currentUser.name,
      message: message.trim(),
      timestamp: now,
    } as any);
    if (ticket.status === "Resolved") {
      ticket.status = "Open";
    }
    await ticket.save();

    return NextResponse.json({ success: true, ticket: ticket.toObject() });
  } catch (error: any) {
    console.error("Error replying to support ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reply" },
      { status: 500 }
    );
  }
}
