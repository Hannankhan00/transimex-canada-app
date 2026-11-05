import { describe, expect, it } from "vitest";
import { shipDateOptions, shipDateText } from "../shipDates";

const at = (iso: string) => new Date(`${iso}T15:00:00Z`);

describe("the ship dates a client can choose", () => {
  it("starts on the next business day", () => {
    // Wednesday 2026-11-04 -> Thursday the 5th
    expect(shipDateOptions(at("2026-11-04"))[0]).toBe("2026-11-05");
  });

  it("skips the weekend when booking on a Friday", () => {
    // Friday 2026-11-06 -> Monday the 9th
    expect(shipDateOptions(at("2026-11-06"))[0]).toBe("2026-11-09");
  });

  it("never offers today, a past day or a weekend, and stops 30 days out", () => {
    const now = at("2026-11-05");
    const days = shipDateOptions(now);
    expect(days).not.toContain("2026-11-05");
    expect(days.every((d) => d > "2026-11-05" && d <= "2026-12-05")).toBe(true);
    expect(days.every((d) => ![0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay()))).toBe(true);
    expect(days.length).toBeGreaterThan(15);
  });

  it("writes the date in the person's language", () => {
    expect(shipDateText("2026-11-06", "en")).toContain("Friday");
    expect(shipDateText("2026-11-06", "fr")).toContain("vendredi");
  });
});
