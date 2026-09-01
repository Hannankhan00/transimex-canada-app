import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";

export async function GET() {
  try {
    const mongooseInstance = await connectDB();
    const isConnected = mongooseInstance.connection.readyState === 1;

    return NextResponse.json({
      status: "success",
      message: "Connected to MongoDB successfully!",
      readyState: mongooseInstance.connection.readyState,
      dbName: mongooseInstance.connection.name,
      isConnected,
    });
  } catch (error: any) {
    console.error("MongoDB Connection Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to connect to MongoDB",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
