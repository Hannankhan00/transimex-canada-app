import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Quote from "@/models/Quote";
import Shipment from "@/models/Shipment";
import SupportTicket from "@/models/SupportTicket";
import PortalDocument from "@/models/PortalDocument";
import { ClientProfile, mapUserIndustryToClientIndustry } from "@/lib/clientTypes";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();
    const user = await User.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { email: id.toLowerCase() }],
    }).lean();

    if (!user) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const client: ClientProfile = {
      id: user._id.toString(),
      companyName: user.companyName || "",
      primaryContact: user.name,
      email: user.email,
      phone: user.phone || "",
      industry: mapUserIndustryToClientIndustry(user.industry),
      status: user.isVerified !== false ? "Active" : "Deactivated",
      registeredDate: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          })
        : "",
      billingAddress: user.address || "",
      city: user.city || "",
      province: user.province || "",
      postalCode: "",
      country: "Canada",
      taxId: "",
      paymentTerms: "Net 30 Days",
      accountManager: "",
      lifetimeRevenueCad: "$0.00 CAD",
      totalShipmentsCompleted: 0,
      activeQuotesCount: 0,
    };

    const linkedShipments = await Shipment.find({
      $or: [
        { "client.email": client.email.toLowerCase() },
        { "client.userId": client.id },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const linkedQuotes = await Quote.find({
      $or: [
        { "client.email": client.email.toLowerCase() },
        { "client.userId": client.id },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const supportTickets = await SupportTicket.find({
      "client.email": client.email.toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .lean();

    const documents = await PortalDocument.find({ userId: client.id })
      .sort({ createdAt: -1 })
      .lean();

    const mappedDocuments = documents.map((d: any) => ({
      id: d._id.toString(),
      name: d.name,
      type: d.type,
      shipmentId: d.shipmentId,
      dateUploaded: d.createdAt
        ? new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
        : "",
      isClientVisible: d.isClientVisible,
      statusText: d.statusText,
      customsPars: d.customsPars,
    }));

    const mappedQuotes = linkedQuotes.map((q: any) => ({
      id: q.refNumber || q._id.toString(),
      origin: q.route?.origin || "",
      destination: q.route?.destination || "",
      equipment: q.cargo?.equipment || "",
      submittedDate: q.submittedDate || "",
      priceCad: q.priceCad || "",
      status: q.status,
      shipmentId: q.shipmentId || "",
    }));

    const mappedTickets = supportTickets.map((t: any) => {
      const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1].message : t.subject;
      return {
        id: t.ticketId || t._id.toString(),
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        date: new Date(t.updatedAt || t.createdAt).toLocaleString(),
        lastMessage: lastMsg,
      };
    });

    return NextResponse.json({
      success: true,
      client,
      dossier: {
        shipments: linkedShipments,
        quotes: mappedQuotes,
        tickets: mappedTickets,
        documents: mappedDocuments,
        metrics: {
          lifetimeRevenueCad: client.lifetimeRevenueCad,
          totalShipmentsCompleted: linkedShipments.length,
          activeQuotesCount: linkedQuotes.filter(
            (q: any) => q.status === "under_review" || q.status === "reviewing"
          ).length,
          openTicketsCount: supportTickets.filter((t: any) => t.status !== "Resolved").length,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching client 360 dossier:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch client dossier" },
      { status: 500 }
    );
  }
}
