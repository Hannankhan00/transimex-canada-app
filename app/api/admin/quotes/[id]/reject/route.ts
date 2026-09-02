import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Quote from "@/models/Quote";
import { rejectQuote } from "@/lib/mockData";
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

    let updatedQuoteData: any = null;
    let clientEmail = "dispatch@laurentianglobal.ca";
    let clientName = "Marc Tremblay";
    let clientCompany = "Laurentian Global Logistics Ltd.";
    let originStr = "Montreal, QC";
    let destStr = "Detroit, MI";

    // 1. Try DB update
    try {
      await connectDB();
      const existingQuote = await Quote.findOne({
        $or: [{ refNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });

      if (existingQuote) {
        existingQuote.status = "rejected";
        existingQuote.rejectionReason = reason;
        if (adminNotes) existingQuote.adminNotes = adminNotes;
        await existingQuote.save();

        clientEmail = existingQuote.client?.email || clientEmail;
        clientName = existingQuote.client?.name || clientName;
        clientCompany = existingQuote.client?.companyName || clientCompany;
        originStr = existingQuote.route?.origin || originStr;
        destStr = existingQuote.route?.destination || destStr;

        updatedQuoteData = existingQuote.toObject();
      }
    } catch (dbErr) {
      console.warn("[Reject Quote API] DB write error, using storage fallback:", dbErr);
    }

    // 2. Synchronize with mock data layer
    const mockResult = rejectQuote(id, reason, adminNotes);
    if (mockResult && !updatedQuoteData) {
      updatedQuoteData = mockResult;
      clientEmail = mockResult.clientEmail || clientEmail;
      clientName = mockResult.clientName || clientName;
      clientCompany = mockResult.clientCompany || clientCompany;
      originStr = mockResult.origin || originStr;
      destStr = mockResult.destination || destStr;
    }

    // 3. Automated Email Notification to Client via Resend / Nodemailer
    try {
      await sendQuoteRejectedEmail({
        to: clientEmail,
        name: clientName,
        companyName: clientCompany,
        quoteId: id,
        origin: originStr,
        destination: destStr,
        rejectionReason: reason,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send rejection email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Quote ${id} has been declined`,
      quote: updatedQuoteData || { id, status: "rejected", rejectionReason: reason },
    });
  } catch (error: any) {
    console.error("Error rejecting quote:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject quote" },
      { status: 500 }
    );
  }
}
