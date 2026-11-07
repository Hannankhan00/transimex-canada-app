import { describe, expect, it } from "vitest";
import { findWeakness } from "../passwordPolicy";

const ctx = { name: "Hannan Khan", email: "sales.team@canzova.com" };

describe("password policy", () => {
  it("flags sequences, keyboard runs and repeats", () => {
    expect(findWeakness("Xk1234pq", ctx)).toBe("sequence");
    expect(findWeakness("Zabcd9Wm", ctx)).toBe("sequence");
    expect(findWeakness("Pr4321Qm", ctx)).toBe("sequence");
    expect(findWeakness("Qwerty77A", ctx)).toBe("keyboard");
    expect(findWeakness("Azerty88B", ctx)).toBe("keyboard");
    expect(findWeakness("Gh1111xyZ", ctx)).toBe("repeated");
  });
  it("flags common passwords", () => {
    expect(findWeakness("Password1", ctx)).toBe("common");
    expect(findWeakness("Transimex2024", ctx)).toBe("common");
  });
  it("flags the person's own name or email, even with swapped characters", () => {
    expect(findWeakness("Hannan#9Rocks", ctx)).toBe("contains_name");
    expect(findWeakness("my-KHAN-77Z", ctx)).toBe("contains_name");
    expect(findWeakness("H4nn4n!Zq9", ctx)).toBe("contains_name");
    expect(findWeakness("sales.team!8Kq", ctx)).toBe("contains_name");
  });
  it("accepts a good password", () => {
    expect(findWeakness("Blue-Horse-4821", ctx)).toBeNull();
    expect(findWeakness("Tr@in9Maple$Lamp", ctx)).toBeNull();
  });
});
