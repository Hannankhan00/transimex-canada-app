import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { getStoredClients, ClientProfile } from "@/lib/mockData";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.toLowerCase() || "";
    const status = searchParams.get("status") || "all";
    const industry = searchParams.get("industry") || "all";

    // 1. Fetch from mock/storage layer
    let clients: ClientProfile[] = getStoredClients();

    // 2. Fetch registered clients from MongoDB if available
    try {
      await connectDB();
      const dbUsers = await User.find({ role: { $in: ["client", "user"] } }).lean();

      // Merge any new DB users that aren't in INITIAL_CLIENTS
      for (const u of dbUsers) {
        const existing = clients.find(
          (c) => c.email.toLowerCase() === u.email.toLowerCase()
        );
        if (!existing) {
          clients.push({
            id: u._id.toString(),
            companyName: u.companyName || u.name + " Corp",
            primaryContact: u.name,
            email: u.email,
            phone: u.phone || "+1 (514) 555-0100",
            industry: "Manufacturing",
            status: u.isVerified !== false ? "Active" : "Deactivated",
            registeredDate: u.createdAt
              ? new Date(u.createdAt).toLocaleDateString("en-US", {
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
          });
        }
      }
    } catch (dbErr) {
      console.warn("[Admin Clients API] DB read fallback:", dbErr);
    }

    // 3. Filter by search, status, and industry
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
