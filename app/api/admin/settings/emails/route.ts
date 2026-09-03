import { NextResponse } from "next/server";
import { getStoredEmailTemplates } from "@/lib/mockData";

export async function GET() {
  try {
    const templates = getStoredEmailTemplates();
    return NextResponse.json({
      success: true,
      templates,
    });
  } catch (error: any) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email templates" },
      { status: 500 }
    );
  }
}
