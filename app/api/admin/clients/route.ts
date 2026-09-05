import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { ClientProfile, mapUserIndustryToClientIndustry } from "@/lib/clientTypes";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q")?.toLowerCase() || "";
    const status = searchParams.get("status") || "all";
    const industry = searchParams.get("industry") || "all";

    await connectDB();
    const dbUsers = await User.find({ role: { $in: ["client", "user"] } })
      .sort({ createdAt: -1 })
      .lean();

    const clients: ClientProfile[] = dbUsers.map((u: any) => ({
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
      lifetimeRevenueCad: "$0.00 CAD",
      totalShipmentsCompleted: 0,
      activeQuotesCount: 0,
    }));

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
