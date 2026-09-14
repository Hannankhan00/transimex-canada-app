import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import Shipment from "@/models/Shipment";
import Quote from "@/models/Quote";
import { ClientProfile, mapUserIndustryToClientIndustry } from "@/lib/clientTypes";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.toLowerCase() || "";
    const status = searchParams.get("status") || "all";
    const industry = searchParams.get("industry") || "all";

    await connectDB();
    const [dbUsers, allShipments, allQuotes] = await Promise.all([
      User.find({ role: { $in: ["client", "user"] } }).sort({ createdAt: -1 }).lean(),
      Shipment.find({}, "client.email rateCad status").lean(),
      Quote.find({}, "client.email status").lean(),
    ]);

    // Aggregate real per-client totals from shipments/quotes rather than
    // presenting an unconditional placeholder for every client.
    const revenueByEmail = new Map<string, number>();
    const completedShipmentsByEmail = new Map<string, number>();
    for (const s of allShipments as any[]) {
      const email = (s.client?.email || "").toLowerCase();
      if (!email) continue;
      const amount = parseFloat(String(s.rateCad || "").replace(/[^0-9.]/g, "")) || 0;
      revenueByEmail.set(email, (revenueByEmail.get(email) || 0) + amount);
      if (s.status === "Delivered") {
        completedShipmentsByEmail.set(email, (completedShipmentsByEmail.get(email) || 0) + 1);
      }
    }
    const activeQuotesByEmail = new Map<string, number>();
    for (const q of allQuotes as any[]) {
      const email = (q.client?.email || "").toLowerCase();
      if (!email) continue;
      if (q.status === "under_review" || q.status === "reviewing") {
        activeQuotesByEmail.set(email, (activeQuotesByEmail.get(email) || 0) + 1);
      }
    }

    const clients: ClientProfile[] = dbUsers.map((u: any) => {
      const email = (u.email || "").toLowerCase();
      const revenue = revenueByEmail.get(email) || 0;
      return {
        id: u._id.toString(),
        companyName: u.companyName || "",
        primaryContact: u.name,
        email: u.email,
        phone: u.phone || "",
        industry: mapUserIndustryToClientIndustry(u.industry),
        status: u.isVerified !== false ? "Active" : "Deactivated",
        registeredDate: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "2-digit",
              year: "numeric",
            })
          : "",
        billingAddress: u.address || "",
        city: u.city || "",
        province: u.province || "",
        postalCode: "",
        country: "Canada",
        taxId: "",
        paymentTerms: "Net 30 Days",
        accountManager: "",
        lifetimeRevenueCad: `$${revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} CAD`,
        totalShipmentsCompleted: completedShipmentsByEmail.get(email) || 0,
        activeQuotesCount: activeQuotesByEmail.get(email) || 0,
      };
    });

    // Filter by search, status, and industry
    const filtered = clients.filter((c) => {
      if (status !== "all" && c.status.toLowerCase() !== status.toLowerCase()) {
        return false;
      }
      if (industry !== "all" && c.industry.toLowerCase() !== industry.toLowerCase()) {
        return false;
      }
      if (search) {
        return (
          c.companyName.toLowerCase().includes(search) ||
          c.primaryContact.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.industry.toLowerCase().includes(search)
        );
      }
      return true;
    });

    const counts = {
      total: clients.length,
      active: clients.filter((c) => c.status === "Active").length,
      deactivated: clients.filter((c) => c.status === "Deactivated").length,
    };

    return NextResponse.json({
      success: true,
      clients: filtered,
      counts,
    });
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
