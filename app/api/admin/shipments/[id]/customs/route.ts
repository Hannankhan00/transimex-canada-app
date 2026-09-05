import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import { verifyToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    }).lean();

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      customsRecord: {
        shipmentId: shipment.trackingNumber,
        status: shipment.customsStatus || "Pending",
        broker: shipment.customsBroker || "",
        portOfEntry: shipment.portOfEntry || "",
        cbsaPars: shipment.cbsaPars || "",
        cbsaNotes: shipment.cbsaNotes || "",
        duties: {
          amountCad: shipment.duties?.amountCad || "",
          taxGstHst: shipment.duties?.taxGstHst || "",
          brokerageFee: shipment.duties?.brokerageFeeCad || "",
          totalOwed: shipment.duties?.totalOwed || "",
          status: shipment.duties?.status || "Unassessed",
          dispatchedAt: shipment.duties?.dispatchedAt || "",
        },
        lastUpdated: shipment.updatedAt,
      },
      client: shipment.client,
    });
  } catch (error: any) {
    console.error("Error fetching customs record:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch customs record" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, broker, portOfEntry, cbsaPars, cbsaNotes } = body;

    await connectDB();
    const shipment = await Shipment.findOne({
      $or: [{ trackingNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
    });

    if (!shipment) {
      return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
    }

    const previousStatus = shipment.customsStatus;

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

    // Best-effort audit trail entry — never blocks the response
    const actor = verifyToken((await cookies()).get("token")?.value || "");
    if (actor && status && status !== previousStatus && (status === "Held" || status === "Released")) {
      await logAudit({
        actor,
        action: status === "Held" ? "CUSTOMS_HOLD" : "CUSTOMS_RELEASE",
        resourceType: "Customs",
        resourceId: shipment.trackingNumber,
        details:
          status === "Held"
            ? `Placed shipment ${shipment.trackingNumber} on customs hold.${cbsaNotes ? ` Reason: ${cbsaNotes}` : ""}`
            : `Released customs hold on shipment ${shipment.trackingNumber}.`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Customs regulatory compliance updated for shipment ${id}`,
      shipment: shipment.toObject(),
    });
  } catch (error: any) {
    console.error("Error updating customs status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update customs status" },
      { status: 500 }
    );
  }
}
