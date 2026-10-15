import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import ExpressQuote from "@/models/ExpressQuote";

// These checks run before any database call: the schema hooks refuse the write.
describe("ExpressQuote is immutable", () => {
  const id = new mongoose.Types.ObjectId();

  it("refuses every update path", async () => {
    await expect(ExpressQuote.updateOne({ _id: id }, { $set: { serviceName: "x" } }).exec()).rejects.toThrow(/immutable/);
    await expect(ExpressQuote.updateMany({}, { $set: { serviceName: "x" } }).exec()).rejects.toThrow(/immutable/);
    await expect(ExpressQuote.findOneAndUpdate({ _id: id }, { $set: { serviceName: "x" } }).exec()).rejects.toThrow(/immutable/);
    await expect(ExpressQuote.replaceOne({ _id: id }, { serviceName: "x" }).exec()).rejects.toThrow(/immutable/);
    await expect(ExpressQuote.findOneAndReplace({ _id: id }, { serviceName: "x" }).exec()).rejects.toThrow(/immutable/);
  });

  it("refuses to save changes to an existing quote", async () => {
    const quote = new ExpressQuote({
      userId: "u",
      accountId: "a",
      accountType: "b2c",
      carrier: "dhl",
      serviceCode: "P",
      serviceName: "EXPRESS WORLDWIDE",
      request: {},
      pricing: {},
      expiresAt: new Date(),
    });
    quote.isNew = false;
    await expect(quote.save()).rejects.toThrow(/immutable/);
  });
});
