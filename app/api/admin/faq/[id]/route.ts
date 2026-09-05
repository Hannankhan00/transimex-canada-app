import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Faq from "@/models/Faq";
import { toFaqItem } from "@/lib/faqTypes";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { category, question, answer, order } = body;

    await connectDB();
    const faq = await Faq.findById(id);
    if (!faq) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }

    if (category) faq.category = category;
    if (question) {
      faq.question = {
        en: question.en ?? faq.question.en,
        fr: question.fr ?? faq.question.fr,
      };
    }
    if (answer) {
      faq.answer = {
        en: answer.en ?? faq.answer.en,
        fr: answer.fr ?? faq.answer.fr,
      };
    }
    if (typeof order === "number") faq.order = order;

    await faq.save();

    return NextResponse.json({ success: true, faq: toFaqItem(faq) });
  } catch (error: any) {
    console.error("Error updating FAQ:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update FAQ" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const deleted = await Faq.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "FAQ not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting FAQ:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete FAQ" },
      { status: 500 }
    );
  }
}
