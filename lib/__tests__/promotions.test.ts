import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processPromotionImage } from "@/lib/promotionImage";
import { buildPublicPromotion, resolvePlaceholders } from "@/lib/promotionTypes";
import { promotionInputSchema } from "@/lib/validations/promotion";
describe("promotions", () => {
  it("converts to lossless WebP without altering pixels, caps size, passes WebP through, rejects non-images", async () => {
    const raw = await sharp({ create: { width: 300, height: 200, channels: 3, background: { r: 10, g: 99, b: 200 } } })
      .composite([{ input: Buffer.from("<svg width='300' height='200'><circle cx='100' cy='100' r='60' fill='red'/></svg>") }]).png().toBuffer();
    const out = await processPromotionImage(raw);
    expect(out.method).toBe("lossless");
    const a = await sharp(raw).ensureAlpha().raw().toBuffer(); const b = await sharp(out.buffer).ensureAlpha().raw().toBuffer();
    expect(Buffer.compare(a, b)).toBe(0);
    const big = await sharp({ create: { width: 3000, height: 1000, channels: 3, background: "#fff" } }).jpeg().toBuffer();
    const r = await processPromotionImage(big); expect(r.width).toBe(2400); expect(r.resized).toBe(true);
    const w = await sharp(raw).webp({ quality: 70 }).toBuffer();
    expect((await processPromotionImage(w)).method).toBe("passthrough");
    await expect(processPromotionImage(Buffer.from("<svg/>"))).rejects.toThrow();
  });
  it("validates input and builds the localized public shape", () => {
    const text = (t: string) => ({ title: t, description: "Departure on {{date}} to {{destination}}.", badge: "b", ctaLabel: "Go", footer: "", imageAlt: "" });
    const parsed = promotionInputSchema.parse({ name: "n", departureDate: "2026-10-16", destination: { city: "Douala", countryCode: "cm" }, ports: [{ label: "Matadi", countryCode: "cd" }], cta: { url: "/quote" }, content: { en: text("A"), fr: text("B") } });
    expect(parsed.destination.countryCode).toBe("CM");
    const dto: any = { id: "1", ...parsed, image: { en: null, fr: null } };
    expect(resolvePlaceholders("x {{date}} {{destination}}", dto, "fr")).toBe("x 16 octobre 2026 Douala, Cameroun");
    const v = buildPublicPromotion(dto, "en", "https://x.test");
    expect(v.destination.flagUrl).toBe("https://x.test/flags/cm.svg");
    expect(promotionInputSchema.safeParse({ ...parsed, cta: { url: "javascript:alert(1)" } }).success).toBe(false);
  });
});
