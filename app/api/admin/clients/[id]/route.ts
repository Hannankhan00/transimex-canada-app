import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Quote from "@/models/Quote";
import Shipment from "@/models/Shipment";
import {
  getStoredClients,
  getStoredQuotes,
  getStoredDocuments,
  ClientProfile,
} from "@/lib/mockData";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Locate Client Profile
    const clients = getStoredClients();
    let client: ClientProfile | undefined = clients.find(
      (c) => c.id.toLowerCase() === id.toLowerCase() || c.email.toLowerCase() === id.toLowerCase()
    );

    // If not found in store, check MongoDB User collection
    if (!client) {
      try {
        await connectDB();
        const user = await User.findOne({
          $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { email: id.toLowerCase() }],
        }).lean();

        if (user) {
          client = {
            id: user._id.toString(),
            companyName: user.companyName || user.name + " Corp",
            primaryContact: user.name,
            email: user.email,
            phone: user.phone || "+1 (514) 555-0100",
            industry: "Manufacturing",
            status: user.isVerified !== false ? "Active" : "Deactivated",
            registeredDate: user.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })
              : "Recent",
            billingAddress: "Registered Corporate Address",
            city: "Montreal",
            province: "QC",
            postalCode: "H3B 2Y5",
            country: "Canada",
            taxId: "GST-PENDING-RT0001",
            paymentTerms: "Net 30 Days",
            accountManager: "Jean-Philippe Tremblay",
            lifetimeRevenueCad: "$0.00 CAD",
            totalShipmentsCompleted: 0,
            activeQuotesCount: 0,
          };
        }
      } catch (dbErr) {
        console.warn("[Client Dossier API] DB lookup error:", dbErr);
      }
    }

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // 2. Fetch Client's Shipments (from DB & mock)
    let linkedShipments: any[] = [];
    try {
      await connectDB();
      const dbShipments = await Shipment.find({
        $or: [
          { "client.email": client.email.toLowerCase() },
          { "client.companyName": { $regex: new RegExp(client.companyName, "i") } },
        ],
      }).lean();
      linkedShipments = dbShipments;
    } catch (e) {
      console.warn("[Client Dossier API] Shipments DB fallback");
    }

    // If no DB shipments found, link initial mock shipments based on company/email
    if (linkedShipments.length === 0) {
      if (client.companyName.includes("Laurentian")) {
        linkedShipments = [
          {
            trackingNumber: "TMX-00839",
            route: { origin: "Dorval Terminal, QC", destination: "Calgary Logistics Center, AB" },
            cargo: { transportMode: "Intermodal Rail", equipment: "53' High-Cube Container", commodity: "Heavy Industrial Machinery Parts" },
            status: "Customs Hold",
            customsStatus: "Held",
            rateCad: "$4,650.00 CAD",
            assignedCarrier: "Canadian Pacific Rail Freight",
            eta: "Sep 04, 2026",
            createdAt: "2026-09-01T09:00:00Z",
          },
          {
            trackingNumber: "TMX-00810",
            route: { origin: "Ottawa Valley Hub, ON", destination: "Montreal Port Berth 42, QC" },
            cargo: { transportMode: "Flatbed Heavy Haul", equipment: "53' Flatbed Heavy", commodity: "Industrial Turbines" },
            status: "Delivered",
            customsStatus: "Released",
            rateCad: "$3,400.00 CAD",
            assignedCarrier: "Cole International Transport",
            eta: "Delivered",
            createdAt: "2026-08-30T10:00:00Z",
          },
        ];
      } else if (client.companyName.includes("Pacific Gateway")) {
        linkedShipments = [
          {
            trackingNumber: "TMX-00847",
            route: { origin: "Montreal Hub, QC", destination: "Toronto Distribution Center, ON" },
            cargo: { transportMode: "53' Dry Van", equipment: "53' Tandem Dry Van", commodity: "Consumer Electronics" },
            status: "In Transit",
            customsStatus: "Released",
            rateCad: "$6,200.00 CAD",
            assignedCarrier: "Transimex Dedicated Express Fleet",
            eta: "Today, 04:15 PM",
            createdAt: "2026-09-02T08:30:00Z",
          },
        ];
      }
    }

    // 3. Fetch Client's Quotes
    const allQuotes = getStoredQuotes();
    const linkedQuotes = allQuotes.filter(
      (q) =>
        (q.clientEmail && q.clientEmail.toLowerCase() === client!.email.toLowerCase()) ||
        (q.clientCompany && q.clientCompany.toLowerCase() === client!.companyName.toLowerCase())
    );

    // 4. Fetch Client's Documents
    const allDocs = getStoredDocuments();
    const clientShipmentIds = linkedShipments.map((s) => s.trackingNumber || s.id);
    const linkedDocuments = allDocs.filter((d) =>
      clientShipmentIds.includes(d.shipmentId)
    );

    // 5. Support Tickets Log
    const supportTickets = [
      {
        id: "TKT-8841",
        subject: "CBSA PARS customs clearance update inquiry",
        status: "In Progress",
        priority: "High",
        date: "Yesterday, 14:15",
        lastMessage: "Transimex Customs Brokerage responded: Verified B3 form submitted to CBSA Officer #814.",
      },
      {
        id: "TKT-7720",
        subject: "Overnight reefers temperature monitoring data request",
        status: "Resolved",
        priority: "Normal",
        date: "Aug 26, 2026",
        lastMessage: "ELD telematics log exported and attached to shipment paperwork.",
      },
    ];

    return NextResponse.json({
      success: true,
      client,
      dossier: {
        shipments: linkedShipments,
        quotes: linkedQuotes,
        documents: linkedDocuments,
        tickets: supportTickets,
        metrics: {
          lifetimeRevenueCad: client.lifetimeRevenueCad,
          totalShipmentsCompleted: linkedShipments.length || client.totalShipmentsCompleted,
          activeQuotesCount: linkedQuotes.length || client.activeQuotesCount,
          openTicketsCount: supportTickets.filter((t) => t.status !== "Resolved").length,
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
