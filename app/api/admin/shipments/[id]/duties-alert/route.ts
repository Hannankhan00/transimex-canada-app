import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { updateCustomsRecordForShipment, getCustomsRecordForShipment } from "@/lib/mockData";
import { sendDutiesNoticeEmail } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      dutiesAmount,
      taxesAmount,
      brokerageFee,
      totalOwed,
      wirePaymentInstructions,
      clientEmail,
      clientName,
      clientCompany,
    } = body;

    if (!totalOwed || totalOwed === "$0.00 CAD") {
      return NextResponse.json(
        { error: "Valid total duties assessment amount is required" },
        { status: 400 }
      );
    }

    const recipientEmail = clientEmail || "dispatch@laurentianglobal.ca";
    const recipientName = clientName || "Marc Tremblay";
    const recipientCompany = clientCompany || "Laurentian Global Logistics Ltd.";

    const customsRecord = getCustomsRecordForShipment(id);

    // 1. Update Shipment record in MongoDB if connected
    try {
      await connectDB();
      const shipment = await Shipment.findOne({
        $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });

      if (shipment) {
        shipment.duties = {
          amountCad: dutiesAmount || "$0.00 CAD",
          taxGstHst: taxesAmount || "$0.00 CAD",
          totalOwed: totalOwed,
          status: "Notice Dispatched",
          dispatchedAt: new Date().toISOString(),
        };
        // Illuminate customs hold if not cleared
        if (shipment.customsStatus !== "Released") {
          shipment.customsStatus = "Held";
          shipment.status = "Customs Hold";
        }
        await shipment.save();
      }
    } catch (dbErr) {
      console.warn("[Duties Alert API] DB write issue, using storage layer:", dbErr);
    }

    // 2. Synchronize with mock/storage layer
    updateCustomsRecordForShipment(id, {
      duties: {
        amountCad: dutiesAmount || "$0.00 CAD",
        taxGstHst: taxesAmount || "$0.00 CAD",
        brokerageFee: brokerageFee || "$0.00 CAD",
        totalOwed: totalOwed,
        status: "Notice Dispatched",
        dispatchedAt: new Date().toISOString(),
      },
      status: customsRecord.status === "Released" ? "Released" : "Held",
    });

    // 3. Dispatch transactional email to client via Resend / SMTP
    try {
      await sendDutiesNoticeEmail({
        to: recipientEmail,
        name: recipientName,
        companyName: recipientCompany,
        trackingId: id,
        dutiesAmount: dutiesAmount || "$0.00 CAD",
        taxesAmount: taxesAmount || "$0.00 CAD",
        brokerageFee: brokerageFee || "$0.00 CAD",
        totalOwed: totalOwed,
        portOfEntry: customsRecord.portOfEntry,
        cbsaPars: customsRecord.cbsaPars,
        wirePaymentInstructions,
      });
    } catch (mailErr) {
      console.warn("[Email Notification] Could not send duties notice email:", mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `Duties payment notice successfully dispatched to ${recipientEmail}`,
      shipmentId: id,
      totalOwed,
      dispatchedTo: recipientEmail,
    });
  } catch (error: any) {
    console.error("Error dispatching duties notice:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch duties notice" },
      { status: 500 }
    );
  }
}
