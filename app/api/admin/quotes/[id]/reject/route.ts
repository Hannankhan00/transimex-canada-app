import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendQuoteRejectedEmail } from "@/lib/email";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { reason, adminNotes } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "A valid rejection reason must be provided" },
        { status: 400 }
      );
    }

    await connectDB();
    const existingQuote = await Quote.findOne({
      $or: [{ refNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    existingQuote.status = "rejected";
    existingQuote.rejectionReason = reason;
    if (adminNotes) existingQuote.adminNotes = adminNotes;
    await existingQuote.save();

    if (existingQuote.client?.email) {
      try {
        await sendQuoteRejectedEmail({
          to: existingQuote.client.email,
          name: existingQuote.client.name,
          companyName: existingQuote.client.companyName || "",
          quoteId: id,
          origin: existingQuote.route?.origin || "",
          destination: existingQuote.route?.destination || "",
          rejectionReason: reason,
        });
      } catch (mailErr) {
        console.warn("[Email Notification] Could not send rejection email:", mailErr);
      }
    }

    const cookieStore = await cookies();
    const actor = verifyToken(cookieStore.get("token")?.value || "");
    if (actor) {
      await logAudit({
        actor,
        action: "QUOTE_REJECTED",
        resourceType: "Quote",
        resourceId: existingQuote.refNumber,
        details: `Quote ${existingQuote.refNumber} rejected: ${reason}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Quote ${id} has been declined`,
      quote: existingQuote.toObject(),
    });
  } catch (error: any) {
    console.error("Error rejecting quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject quote" },
      { status: 500 }
    );
  }
}
