import { afterEach, describe, expect, it, vi } from "vitest";
import { termsContentSchema } from "../validation";
import { DEFAULT_TERMS, DEFAULT_TERMS_VERSION } from "../terms";

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
  emailTemplateWrapper: (html: string) => html,
  escapeHtml: (v: string) => v,
  getAdminNotificationEmail: () => "admin@example.test",
}));

import { sendEmail } from "@/lib/email";
import { expressEmailsEnabled, sendExpressApplicationAdminAlert, sendExpressDecisionEmail } from "@/lib/expressEmail";

describe("terms content validation", () => {
  it("accepts the built-in default terms", () => {
    expect(DEFAULT_TERMS_VERSION).toBe("v1");
    expect(termsContentSchema.safeParse(DEFAULT_TERMS).success).toBe(true);
  });

  it("requires both languages", () => {
    expect(termsContentSchema.safeParse({ en: DEFAULT_TERMS.en }).success).toBe(false);
  });

  it("rejects blank headings, blank sections and an empty section list", () => {
    expect(termsContentSchema.safeParse({ ...DEFAULT_TERMS, fr: { ...DEFAULT_TERMS.fr, heading: " " } }).success).toBe(false);
    expect(termsContentSchema.safeParse({ ...DEFAULT_TERMS, en: { ...DEFAULT_TERMS.en, sections: [] } }).success).toBe(false);
    expect(
      termsContentSchema.safeParse({ ...DEFAULT_TERMS, en: { ...DEFAULT_TERMS.en, sections: [{ title: "x", body: "" }] } }).success
    ).toBe(false);
  });
});

describe("Express emails are off by default", () => {
  afterEach(() => {
    delete process.env.EXPRESS_EMAILS_ENABLED;
    vi.clearAllMocks();
  });

  const decision = { to: "c@example.test", name: "C", language: "fr" as const, decision: "approved" as const };
  const alert = { companyName: "A", contactName: "B", phone: "1", country: "CA", businessType: "x", expectedMonthlyVolume: "5", accountId: "1" };

  it("sends nothing unless EXPRESS_EMAILS_ENABLED is exactly true", async () => {
    expect(expressEmailsEnabled()).toBe(false);
    expect(await sendExpressDecisionEmail(decision)).toMatchObject({ skipped: true });
    expect(await sendExpressApplicationAdminAlert(alert)).toMatchObject({ skipped: true });
    process.env.EXPRESS_EMAILS_ENABLED = "yes";
    await sendExpressDecisionEmail(decision);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends once enabled", async () => {
    process.env.EXPRESS_EMAILS_ENABLED = "true";
    await sendExpressDecisionEmail(decision);
    await sendExpressApplicationAdminAlert(alert);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});
