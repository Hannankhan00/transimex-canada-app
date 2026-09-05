import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import SupportTicket from "@/models/SupportTicket";
import { sendTicketUpdateEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, message, internalNotes, responderName, isInternal } = body;

    await connectDB();
    const dbTicket = await SupportTicket.findOne({
      $or: [{ ticketId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!dbTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const previousStatus = dbTicket.status;

    if (status) dbTicket.status = status;
    if (priority) dbTicket.priority = priority;
    if (internalNotes !== undefined) dbTicket.internalNotes = internalNotes;

    if (message) {
      dbTicket.messages.push({
        sender: "admin",
        senderName: responderName || "Transimex Operations",
        message,
        timestamp: new Date().toLocaleString(),
        isInternal: !!isInternal,
      });
    }
    await dbTicket.save();

    // Send email alert to client if public response or status change
    if ((message && !isInternal) || (status && status !== previousStatus)) {
      try {
        await sendTicketUpdateEmail({
          to: dbTicket.client.email,
          name: dbTicket.client.name,
          ticketId: dbTicket.ticketId,
          subject: dbTicket.subject,
          status: dbTicket.status,
          latestMessage: message || `Ticket status updated to ${status}`,
          shipmentId: dbTicket.shipmentId,
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send ticket update email:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Ticket ${dbTicket.ticketId} updated successfully`,
      ticket: dbTicket.toObject(),
    });
  } catch (error: any) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}
