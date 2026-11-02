import { beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The session helper reads the cookie through next/headers; point it at a variable the tests control.
let cookieValue: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => (name === "token" && cookieValue ? { value: cookieValue } : undefined) }) }));
vi.mock("@/lib/mongoose", () => ({ default: async () => undefined }));

import { signToken } from "../auth";
import { getCurrentUser } from "../session";
import { proxy } from "../../proxy";
import { NEW_PASSWORD_MIN_LENGTH, PASSWORD_PROBLEM_TEXT, checkNewPassword } from "../passwordRules";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-forced-password-change";
});

const tokenFor = (extra: Record<string, unknown> = {}) => signToken({ userId: "u1", email: "amina@example.com", name: "Amina", companyName: "A", role: "client", ...extra });

const page = (path: string, token?: string) =>
  proxy(new NextRequest(`http://localhost${path}`, { headers: token ? { cookie: `token=${token}` } : {} }));
const redirectOf = (res: Response) => res.headers.get("location") ?? "";

describe("choosing a new password to replace a temporary one", () => {
  it("accepts a good password", () => {
    expect(checkNewPassword({ current: "Temp#Pass1234", next: "Blue-Horse-4821", email: "amina@example.com" })).toBeNull();
  });

  it("rejects short, unchanged, letters-only, numbers-only, email-based and repetitive passwords", () => {
    const base = { current: "Temp#Pass1234", email: "amina.diallo@example.com" };
    expect(checkNewPassword({ ...base, next: "Ab1" })).toBe("too_short");
    expect(checkNewPassword({ ...base, next: "x".repeat(NEW_PASSWORD_MIN_LENGTH - 1) })).toBe("too_short");
    expect(checkNewPassword({ ...base, next: "Temp#Pass1234" })).toBe("same_as_current");
    expect(checkNewPassword({ ...base, next: "onlylettershere" })).toBe("needs_letter_and_number");
    expect(checkNewPassword({ ...base, next: "12345678901234" })).toBe("needs_letter_and_number");
    expect(checkNewPassword({ ...base, next: "My.amina.diallo.99" })).toBe("contains_email");
    expect(checkNewPassword({ ...base, next: "aaaaaaaaaa1" })).toBe("too_repetitive");
    expect(checkNewPassword({ ...base, next: "a1".repeat(200) })).toBe("too_long");
  });

  it("every problem has a sentence in English and French", () => {
    for (const text of Object.values(PASSWORD_PROBLEM_TEXT)) {
      expect(text.en.length).toBeGreaterThan(5);
      expect(text.fr.length).toBeGreaterThan(5);
    }
  });
});

describe("a temporary password is not a session", () => {
  it("getCurrentUser treats a flagged sign-in as signed out, except where the password change is allowed", async () => {
    cookieValue = tokenFor({ mustChangePassword: true });
    expect(await getCurrentUser()).toBeNull();
    expect(await getCurrentUser({ allowPasswordChange: true })).toMatchObject({ userId: "u1", mustChangePassword: true });
  });

  it("a normal sign-in is unaffected", async () => {
    cookieValue = tokenFor();
    expect(await getCurrentUser()).toMatchObject({ userId: "u1" });
    cookieValue = tokenFor({ mustChangePassword: false });
    expect(await getCurrentUser()).toMatchObject({ userId: "u1" });
  });

  it("signed out stays signed out", async () => {
    cookieValue = undefined;
    expect(await getCurrentUser({ allowPasswordChange: true })).toBeNull();
  });
});

describe("pages while the password is temporary", () => {
  const flagged = () => tokenFor({ mustChangePassword: true });

  it("sends every app page to the change-password page", () => {
    for (const path of ["/dashboard", "/dashboard/shipments", "/express", "/express/book", "/admin", "/login", "/complete-profile"]) {
      expect(redirectOf(page(path, flagged()))).toContain("/change-password");
    }
  });

  it("lets them open the change-password page itself", () => {
    expect(redirectOf(page("/change-password", flagged()))).toBe("");
  });

  it("keeps everyone else out of the change-password page", () => {
    expect(redirectOf(page("/change-password"))).toContain("/login");
    expect(redirectOf(page("/change-password", tokenFor()))).toContain("/dashboard");
  });

  it("does not change anything for a normal sign-in", () => {
    expect(redirectOf(page("/express", tokenFor()))).toBe("");
    expect(redirectOf(page("/login", tokenFor()))).toContain("/dashboard");
  });
});
