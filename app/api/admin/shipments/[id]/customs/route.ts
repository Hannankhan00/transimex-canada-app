import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { updateCustomsRecordForShipment, getCustomsRecordForShipment } from "@/lib/mockData";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, broker, portOfEntry, cbsaPars, cbsaNotes } = body;

    // 1. Update DB record if connected
    let updatedDbRecord: any = null;
    try {
      await connectDB();
      const shipment = await Shipment.findOne({
        $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
      });

      if (shipment) {
        if (status) shipment.customsStatus = status;
        if (broker) shipment.customsBroker = broker;
        if (portOfEntry) shipment.portOfEntry = portOfEntry;
        if (cbsaPars) shipment.cbsaPars = cbsaPars;
        if (cbsaNotes !== undefined) shipment.cbsaNotes = cbsaNotes;

        // Sync main status if customs hold
        if (status === "Held") {
          shipment.status = "Customs Hold";
        } else if (status === "Released" && shipment.status === "Customs Hold") {
          shipment.status = "In Transit";
        }

        await shipment.save();
        updatedDbRecord = shipment.toObject();
      }
    } catch (dbErr) {
      console.warn("[Admin Customs API] DB write issue, falling back to mock layer:", dbErr);
    }

    // 2. Synchronize with mock/storage layer
    const updatedCustomsRecord = updateCustomsRecordForShipment(id, {
      ...(status && { status }),
      ...(broker && { broker }),
      ...(portOfEntry && { portOfEntry }),
      ...(cbsaPars && { cbsaPars }),
      ...(cbsaNotes !== undefined && { cbsaNotes }),
    });

    return NextResponse.json({
      success: true,
      message: `Customs regulatory compliance updated for shipment ${id}`,
      customsRecord: updatedCustomsRecord,
      shipment: updatedDbRecord,
    });
  } catch (error: any) {
    console.error("Error updating customs status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update customs status" },
      { status: 500 }
    );
  }
}
