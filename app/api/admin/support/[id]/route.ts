import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import SupportTicket from "@/models/SupportTicket";
import { updateTicketInStore, getStoredTickets } from "@/lib/mockData";
import { sendTicketUpdateEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, priority, message, internalNotes, responderName, isInternal } = body;

    const allTickets = getStoredTickets();
    const existing = allTickets.find((t) => t.ticketId === id || t.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (internalNotes !== undefined) updates.internalNotes = internalNotes;

    // Update DB record if present
    try {
      await connectDB();
      const dbTicket = await SupportTicket.findOne({
        $or: [{ ticketId: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });

      if (dbTicket) {
        if (status) dbTicket.status = status;
        if (priority) dbTicket.priority = priority;
        if (internalNotes !== undefined) dbTicket.internalNotes = internalNotes;

        if (message) {
          dbTicket.messages.push({
            sender: "admin",
            senderName: responderName || "Transimex Operations Lead",
            message,
            timestamp: new Date().toLocaleString(),
            isInternal: !!isInternal,
          });
        }
        await dbTicket.save();
      }
    } catch (dbErr) {
      console.warn("[Admin Support API] DB update fallback:", dbErr);
    }

    // Update storage store
    const updated = updateTicketInStore(
      id,
      updates,
      message,
      responderName || "Transimex Operations Lead",
      isInternal
    );

    // Send email alert to client if public response or status change
    const ticketRef = existing.ticketId || existing.id;
    if ((message && !isInternal) || (status && status !== existing.status)) {
      try {
        await sendTicketUpdateEmail({
          to: existing.client?.email || "dispatch@laurentianglobal.ca",
          name: existing.client?.name || "Client Lead",
          ticketId: ticketRef,
          subject: existing.subject,
          status: status || existing.status,
          latestMessage: message || `Ticket status updated to ${status}`,
          shipmentId: existing.shipmentId || existing.linkedShipmentId,
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send ticket update email:", mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Ticket ${ticketRef} updated successfully`,
      ticket: updated,
    });
  } catch (error: any) {
    console.error("Error updating ticket:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update ticket" },
      { status: 500 }
    );
  }
}
