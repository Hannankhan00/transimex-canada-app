import { describe, expect, it } from "vitest";
import { lengthToCm, unitLabel, weightFromKg, weightToKg } from "../units";

describe("pounds and inches", () => {
  it("converts to the kilograms and centimetres the server and DHL use", () => {
    expect(weightToKg(1, "imperial")).toBe(0.454);
    expect(weightToKg(185, "imperial")).toBe(83.915);
    expect(lengthToCm(5, "imperial")).toBe(12.7);
    expect(lengthToCm(18, "imperial")).toBe(45.7);
  });

  it("leaves metric values alone", () => {
    expect(weightToKg(2, "metric")).toBe(2);
    expect(lengthToCm(10, "metric")).toBe(10);
  });

  it("shows a weight in the chosen unit and swaps the label", () => {
    expect(weightFromKg(0.454, "imperial")).toBe(1);
    expect(weightFromKg(2, "metric")).toBe(2);
    expect(unitLabel("Weight (kg)", "imperial")).toBe("Weight (lb)");
    expect(unitLabel("Length (cm)", "imperial")).toBe("Length (in)");
    expect(unitLabel("Weight (kg)", "metric")).toBe("Weight (kg)");
  });
});
