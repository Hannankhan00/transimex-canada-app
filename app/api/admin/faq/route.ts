import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import Faq from "@/models/Faq";
import { toFaqItem } from "@/lib/faqTypes";

export async function GET() {
  try {
    await connectDB();
    const docs = await Faq.find({}).sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, faqs: docs.map(toFaqItem) });
  } catch (error: any) {
    console.error("Error fetching FAQs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch FAQs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, question, answer, order } = body;

    if (!question?.en || !answer?.en) {
      return NextResponse.json(
        { error: "English question and answer are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const faq = await Faq.create({
      category: category || "Operations",
      question: { en: question.en, fr: question.fr || question.en },
      answer: { en: answer.en, fr: answer.fr || answer.en },
      order: typeof order === "number" ? order : 0,
    });

    return NextResponse.json({ success: true, faq: toFaqItem(faq) });
  } catch (error: any) {
    console.error("Error creating FAQ:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create FAQ" },
      { status: 500 }
    );
  }
}
