import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  try {
    await connectDB();

    const hashedPassword = await hashPassword("qwerty1234");

    // 1. Seed Super Admin
    let superAdmin = await User.findOne({ email: "admin@gmail.com" });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: "Transimex Super Admin",
        email: "admin@gmail.com",
        password: hashedPassword,
        companyName: "Transimex Canada HQ",
        role: "superadmin",
      });
    } else {
      superAdmin.password = hashedPassword;
      superAdmin.role = "superadmin";
      superAdmin.name = "Transimex Super Admin";
      superAdmin.companyName = "Transimex Canada HQ";
      await superAdmin.save();
    }

    // 2. Seed Client
    let client = await User.findOne({ email: "client@gmail.com" });
    if (!client) {
      client = await User.create({
        name: "Transimex Client User",
        email: "client@gmail.com",
        password: hashedPassword,
        companyName: "Laurentian Global Logistics Ltd.",
        role: "client",
      });
    } else {
      client.password = hashedPassword;
      client.role = "client";
      client.name = "Transimex Client User";
      client.companyName = "Laurentian Global Logistics Ltd.";
      await client.save();
    }

    return NextResponse.json({
      success: true,
      message: "Database successfully seeded with Super Admin & Client accounts",
      accounts: [
        { email: "admin@gmail.com", role: "superadmin", portal: "/admin" },
        { email: "client@gmail.com", role: "client", portal: "/dashboard" },
      ],
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
