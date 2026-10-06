import { NextResponse } from "next/server";

async function translateChunk(text: string, fromLang = "en", toLang = "fr"): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(
      text
    )}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Translation API responded with ${res.status}`);
    }

    const data = await res.json();
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data[0].map((item: any) => item[0]).join("");
    }
    return text;
  } catch (err: any) {
    console.error("Chunk translation error:", err);
    return text;
  }
}

async function translateText(fullText: string, fromLang = "en", toLang = "fr"): Promise<string> {
  if (!fullText || !fullText.trim()) return "";

  // If text is short, translate in a single request
  if (fullText.length < 1800) {
    return await translateChunk(fullText, fromLang, toLang);
  }

  // If text is long, split on paragraph breaks or block tag boundaries
  const parts = fullText.split(/(<\/p>|<\/div>|<\/h[1-6]>|<\/blockquote>|\n\n)/gi);
  const translatedParts: string[] = [];
  let buffer = "";

  for (const part of parts) {
    if ((buffer + part).length > 1500) {
      if (buffer.trim()) {
        const tr = await translateChunk(buffer, fromLang, toLang);
        translatedParts.push(tr);
        buffer = "";
      }
    }
    buffer += part;
  }

  if (buffer.trim()) {
    const tr = await translateChunk(buffer, fromLang, toLang);
    translatedParts.push(tr);
  }

  return translatedParts.join("");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, excerpt, content, metaTitle, metaDescription } = body;

    if (!title && !content && !excerpt) {
      return NextResponse.json(
        { error: "No content provided to translate" },
        { status: 400 }
      );
    }

    const [
      titleFr,
      excerptFr,
      contentFr,
      metaTitleFr,
      metaDescFr,
    ] = await Promise.all([
      title ? translateText(title, "en", "fr") : Promise.resolve(""),
      excerpt ? translateText(excerpt, "en", "fr") : Promise.resolve(""),
      content ? translateText(content, "en", "fr") : Promise.resolve(""),
      metaTitle ? translateText(metaTitle, "en", "fr") : Promise.resolve(""),
      metaDescription ? translateText(metaDescription, "en", "fr") : Promise.resolve(""),
    ]);

    return NextResponse.json({
      success: true,
      translations: {
        title: titleFr,
        excerpt: excerptFr,
        content: contentFr,
        metaTitle: metaTitleFr,
        metaDescription: metaDescFr,
      },
    });
  } catch (error: any) {
    console.error("Error during blog auto-translation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-translate content" },
      { status: 500 }
    );
  }
}
