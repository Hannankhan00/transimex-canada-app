import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Shipment from "@/models/Shipment";
import Quote from "@/models/Quote";
import User from "@/models/User";
import Carrier from "@/models/Carrier";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

    await connectDB();

    // 1. Build Shipment Query
    const shipmentFilter = words.length > 0
      ? {
          $and: words.map((word) => {
            const regex = new RegExp(escapeRegex(word), "i");
            return {
              $or: [
                { trackingNumber: regex },
                { quoteId: regex },
                { "route.origin": regex },
                { "route.destination": regex },
                { "client.companyName": regex },
                { "client.name": regex },
                { assignedCarrier: regex },
                { driverName: regex },
                { status: regex },
                { "cargo.equipment": regex },
                { cbsaPars: regex },
              ],
            };
          }),
        }
      : {};

    // 2. Build Quote Query
    const quoteFilter = words.length > 0
      ? {
          $and: words.map((word) => {
            const regex = new RegExp(escapeRegex(word), "i");
            return {
              $or: [
                { refNumber: regex },
                { "client.name": regex },
                { "client.companyName": regex },
                { "client.email": regex },
                { "route.origin": regex },
                { "route.destination": regex },
                { "cargo.equipment": regex },
                { status: regex },
                { priceCad: regex },
              ],
            };
          }),
        }
      : {};

    // 3. Build Client Query
    const clientFilter = {
      role: { $in: ["client", "user"] },
      ...(words.length > 0
        ? {
            $and: words.map((word) => {
              const regex = new RegExp(escapeRegex(word), "i");
              return {
                $or: [
                  { name: regex },
                  { companyName: regex },
                  { email: regex },
                  { industry: regex },
                  { phone: regex },
                  { city: regex },
                  { province: regex },
                ],
              };
            }),
          }
        : {}),
    };

    // 4. Build Carrier Query
    const carrierFilter = words.length > 0
      ? {
          $and: words.map((word) => {
            const regex = new RegExp(escapeRegex(word), "i");
            return {
              $or: [
                { name: regex },
                { code: regex },
                { primaryMode: regex },
                { headquarters: regex },
                { operatingLanes: regex },
                { "dispatchContact.name": regex },
                { "dispatchContact.email": regex },
              ],
            };
          }),
        }
      : {};

    const [dbShipments, dbQuotes, dbUsers, dbCarriers] = await Promise.all([
      Shipment.find(shipmentFilter).sort({ createdAt: -1 }).limit(15).lean(),
      Quote.find(quoteFilter).sort({ createdAt: -1 }).limit(15).lean(),
      User.find(clientFilter).sort({ createdAt: -1 }).limit(15).lean(),
      Carrier.find(carrierFilter).sort({ createdAt: -1 }).limit(12).lean(),
    ]);

    const shipments = (dbShipments as any[]).map((s) => {
      const trackingId = s.trackingNumber || s._id.toString();
      const origin = s.route?.origin || "";
      const destination = s.route?.destination || "";
      const equipment = s.cargo?.equipment || "";
      const carrier = s.assignedCarrier || s.driverName || "Dedicated Fleet";
      const status = s.status || "Pending Dispatch";
      const company = s.client?.companyName || s.client?.name || "";

      return {
        id: trackingId,
        type: "shipment",
        title: trackingId,
        subtitle: origin && destination ? `${origin} → ${destination}` : origin || destination || "Domestic Route",
        detail: [equipment, carrier, company].filter(Boolean).join(" • "),
        status,
        href: `/admin/shipments?search=${encodeURIComponent(trackingId)}`,
        searchableText: `${trackingId} ${s.quoteId || ""} ${origin} ${destination} ${equipment} ${carrier} ${company} ${status} shipment expédition fret`,
      };
    });

    const quotes = (dbQuotes as any[]).map((q) => {
      const refId = q.refNumber || q._id.toString();
      const client = q.client?.companyName || q.client?.name || "Client Lead";
      const origin = q.route?.origin || "";
      const destination = q.route?.destination || "";
      const equipment = q.cargo?.equipment || "";
      const status = q.status || "under_review";
      const price = q.priceCad || "Pending CAD";

      return {
        id: refId,
        type: "quote",
        title: refId,
        subtitle: `${client} (${origin || "Origin"} → ${destination || "Dest"})`,
        detail: [equipment, price].filter(Boolean).join(" • "),
        status,
        href: `/admin/quotes?search=${encodeURIComponent(refId)}`,
        searchableText: `${refId} ${client} ${q.client?.email || ""} ${origin} ${destination} ${equipment} ${status} ${price} quote soumission`,
      };
    });

    const clients = (dbUsers as any[]).map((u) => {
      const company = u.companyName || u.name || "Commercial Account";
      const contact = u.name;
      const email = u.email || "";
      const industry = u.industry || "General Commercial";
      const location = [u.city, u.province].filter(Boolean).join(", ");

      return {
        id: u._id.toString(),
        type: "client",
        title: company,
        subtitle: contact && contact !== company ? `${contact} (${email})` : email,
        detail: [industry, location].filter(Boolean).join(" • "),
        status: u.isVerified !== false ? "Active" : "Deactivated",
        href: `/admin/clients?search=${encodeURIComponent(company)}`,
        searchableText: `${company} ${contact} ${email} ${industry} ${location} client account compte`,
      };
    });

    const carriers = (dbCarriers as any[]).map((c) => {
      const name = c.name || "Freight Carrier";
      const code = c.code || "";
      const mode = c.primaryMode || "Road";
      const hq = c.headquarters || "Canada";
      const rating = c.rating ? `★ ${c.rating}` : "";

      return {
        id: c._id.toString(),
        type: "carrier",
        title: code ? `${name} (${code})` : name,
        subtitle: `${hq} • ${mode} Freight`,
        detail: [c.fleetSize, rating, c.status].filter(Boolean).join(" • "),
        status: c.status || "Active",
        href: `/admin/carriers?search=${encodeURIComponent(name)}`,
        searchableText: `${name} ${code} ${mode} ${hq} ${(c.operatingLanes || []).join(" ")} carrier transporteur`,
      };
    });

    return NextResponse.json({
      success: true,
      query: q,
      words,
      counts: {
        shipments: shipments.length,
        quotes: quotes.length,
        clients: clients.length,
        carriers: carriers.length,
        total: shipments.length + quotes.length + clients.length + carriers.length,
      },
      results: {
        shipments,
        quotes,
        clients,
        carriers,
      },
    });
  } catch (error: any) {
    console.error("Admin search API error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to execute admin search" },
      { status: 500 }
    );
  }
}
