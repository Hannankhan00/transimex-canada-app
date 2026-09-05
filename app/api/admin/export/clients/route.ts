import { NextRequest } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { mapUserIndustryToClientIndustry } from "@/lib/clientTypes";
import { serializeToCsv, createCsvDownloadResponse } from "@/lib/csvExport";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    await connectDB();
    const dbUsers = await User.find({ role: { $in: ["client", "user"] } })
      .sort({ createdAt: -1 })
      .lean();

    let clients = dbUsers.map((u: any) => ({
      id: u._id.toString(),
      companyName: u.companyName || "",
      primaryContact: u.name,
      email: u.email,
      phone: u.phone || "",
      industry: mapUserIndustryToClientIndustry(u.industry),
      status: u.isVerified !== false ? "Active" : "Deactivated",
      registeredDate: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
        : "",
    }));

    if (status && status !== "all") {
      clients = clients.filter((c) => c.status.toLowerCase() === status.toLowerCase());
    }

    const flatData = clients.map((c) => ({
      clientId: c.id,
      companyName: c.companyName,
      primaryContact: c.primaryContact,
      email: c.email,
      phone: c.phone,
      industry: c.industry,
      status: c.status,
      registeredDate: c.registeredDate,
    }));

    const headers = [
      { key: "clientId", label: "Client Account ID" },
      { key: "companyName", label: "Enterprise Company Name" },
      { key: "primaryContact", label: "Primary Contact" },
      { key: "email", label: "Contact Email" },
      { key: "phone", label: "Phone" },
      { key: "industry", label: "Industry Sector" },
      { key: "status", label: "Account Access Status" },
      { key: "registeredDate", label: "Onboarding Date" },
    ];

    const csvContent = serializeToCsv(flatData, headers);
    const filename = `transimex_clients_directory_${new Date().toISOString().slice(0, 10)}.csv`;

    return createCsvDownloadResponse(csvContent, filename);
  } catch (error: any) {
    console.error("Error exporting clients CSV:", error);
    return new Response(`Error generating clients export: ${error.message}`, { status: 500 });
  }
}
