import { NextResponse } from "next/server";
import { requirePromotionsAccess } from "@/lib/promotionsAdmin";

// Protect placeholders like {{city}}, {{date}}, {{destination}}, {{country}}
const PLACEHOLDER_MAP: [RegExp, string, string][] = [
  [/\{\{\s*destination\s*\}\}/gi, "___TX_DEST___", "{{destination}}"],
  [/\{\{\s*city\s*\}\}/gi, "___TX_CITY___", "{{city}}"],
  [/\{\{\s*country\s*\}\}/gi, "___TX_COUNTRY___", "{{country}}"],
  [/\{\{\s*date\s*\}\}/gi, "___TX_DATE___", "{{date}}"],
];

function maskPlaceholders(text: string): string {
  let masked = text;
  for (const [regex, token] of PLACEHOLDER_MAP) {
    masked = masked.replace(regex, token);
  }
  return masked;
}

function unmaskPlaceholders(text: string): string {
  let unmasked = text;
  for (const [, token, placeholder] of PLACEHOLDER_MAP) {
    // Matches the token even if Google translate adds whitespace or changes casing
    const tokenRegex = new RegExp(token.replace(/_/g, "[_\\s]*"), "gi");
    unmasked = unmasked.replace(tokenRegex, placeholder);
  }
  return unmasked;
}

async function translateChunk(text: string, fromLang = "en", toLang = "fr"): Promise<string> {
  if (!text || !text.trim()) return "";
  try {
    const masked = maskPlaceholders(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(
      masked
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
      const translated = data[0].map((item: any) => item[0]).join("");
      return unmaskPlaceholders(translated);
    }
    return text;
  } catch (err: any) {
    console.error("Promotion translation chunk error:", err);
    return text;
  }
}

export async function POST(req: Request) {
  try {
    const access = await requirePromotionsAccess();
    if (access.error) return access.error;

    const body = await req.json().catch(() => ({}));
    const { from = "en", to = "fr", fields = {} } = body;

    const fromLang = from === "fr" ? "fr" : "en";
    const toLang = to === "en" ? "en" : "fr";

    const {
      title = "",
      description = "",
      badge = "",
      ctaLabel = "",
      footer = "",
      imageAlt = "",
    } = fields;

    if (!title && !description && !badge && !ctaLabel && !footer && !imageAlt) {
      return NextResponse.json(
        { error: "No promotion text provided to translate." },
        { status: 400 }
      );
    }

    const [
      trTitle,
      trDescription,
      trBadge,
      trCtaLabel,
      trFooter,
      trImageAlt,
    ] = await Promise.all([
      title ? translateChunk(title, fromLang, toLang) : Promise.resolve(""),
      description ? translateChunk(description, fromLang, toLang) : Promise.resolve(""),
      badge ? translateChunk(badge, fromLang, toLang) : Promise.resolve(""),
      ctaLabel ? translateChunk(ctaLabel, fromLang, toLang) : Promise.resolve(""),
      footer ? translateChunk(footer, fromLang, toLang) : Promise.resolve(""),
      imageAlt ? translateChunk(imageAlt, fromLang, toLang) : Promise.resolve(""),
    ]);

    return NextResponse.json({
      success: true,
      translations: {
        title: trTitle,
        description: trDescription,
        badge: trBadge,
        ctaLabel: trCtaLabel,
        footer: trFooter,
        imageAlt: trImageAlt,
      },
    });
  } catch (error: any) {
    console.error("Error during promotion translation:", error);
    return NextResponse.json(
      { error: error.message || "Failed to auto-translate promotion content." },
      { status: 500 }
    );
  }
}
