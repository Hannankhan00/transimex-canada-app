import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import connectDB from "@/lib/mongoose";
import Invoice, { IInvoice } from "@/models/Invoice";
import BankAccount, { IBankAccount, BankAccountCurrency } from "@/models/BankAccount";
import { IQuote } from "@/models/Quote";
import { IShipment } from "@/models/Shipment";

/**
 * Parses a free-text price string like "$4,250.00 CAD" or "4250" into a number.
 * Quote/breakdown amounts are stored as display strings, not numbers.
 */
export function parseAmount(priceStr?: string): number {
  if (!priceStr) return 0;
  const cleaned = priceStr.replace(/[^0-9.]/g, "");
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export function formatAmount(amount: number, currency: BankAccountCurrency): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export async function findInvoiceByIdOrNumber(id: string) {
  await connectDB();
  return Invoice.findOne({
    $or: [{ invoiceNumber: id }, { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }],
  });
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `INV-${year}-${randomSuffix}`;
}

export async function getDefaultBankAccount(
  currency: BankAccountCurrency
): Promise<IBankAccount | null> {
  await connectDB();
  return BankAccount.findOne({ currency, isDefault: true, isActive: true });
}

function addDays(dateIso: string, days: number): string {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Creates (or returns the existing) invoice for a quote. Idempotent so a
 * double-accept race never produces two invoices for the same quote.
 */
export async function createInvoiceForQuote(
  quote: IQuote,
  shipment: IShipment
): Promise<IInvoice> {
  await connectDB();

  const existing = await Invoice.findOne({ quoteRefNumber: quote.refNumber, kind: "freight" });
  if (existing) return existing;

  const currency: BankAccountCurrency = quote.priceUsd && !quote.priceCad ? "USD" : "CAD";
  const primaryPrice = currency === "USD" ? quote.priceUsd : quote.priceCad;

  const lineItems: { description: string; amount: number }[] = [];
  if (quote.breakdown?.lineHaul) {
    lineItems.push({ description: "Line Haul Freight", amount: parseAmount(quote.breakdown.lineHaul) });
  }
  if (quote.breakdown?.fuelSurcharge) {
    lineItems.push({ description: "Fuel Surcharge", amount: parseAmount(quote.breakdown.fuelSurcharge) });
  }
  if (quote.breakdown?.crossBorderFee) {
    lineItems.push({ description: "Cross-Border Fee", amount: parseAmount(quote.breakdown.crossBorderFee) });
  }
  if (quote.breakdown?.accessorials) {
    lineItems.push({ description: "Accessorials", amount: parseAmount(quote.breakdown.accessorials) });
  }
  if (lineItems.length === 0) {
    lineItems.push({ description: `Freight Services — ${quote.cargo?.equipment || "Freight"}`, amount: parseAmount(primaryPrice) });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const total = quote.breakdown?.total ? parseAmount(quote.breakdown.total) : subtotal || parseAmount(primaryPrice);

  const bankAccount = await getDefaultBankAccount(currency);
  const issueDate = new Date().toISOString();

  const invoice = await Invoice.create({
    invoiceNumber: generateInvoiceNumber(),
    kind: "freight",
    quoteRefNumber: quote.refNumber,
    shipmentTrackingNumber: shipment.trackingNumber,
    client: {
      name: quote.client.name,
      companyName: quote.client.companyName || "",
      email: quote.client.email,
      phone: quote.client.phone || "",
      userId: quote.client.userId || "",
    },
    route: {
      origin: quote.route?.origin || "",
      destination: quote.route?.destination || "",
    },
    currency,
    lineItems,
    subtotal,
    total,
    amountDisplay: formatAmount(total, currency),
    status: "unpaid",
    issueDate,
    dueDate: addDays(issueDate, 15),
    bankSnapshot: bankAccount
      ? {
          bankName: bankAccount.bankName,
          beneficiaryName: bankAccount.beneficiaryName,
          accountNumber: bankAccount.accountNumber,
          transitNumber: bankAccount.transitNumber || "",
          institutionNumber: bankAccount.institutionNumber || "",
          swiftBic: bankAccount.swiftBic || "",
          bankAddress: bankAccount.bankAddress || "",
          currency,
        }
      : undefined,
  });

  return invoice;
}

export interface DutiesAssessment {
  dutiesAmount?: string;
  taxesAmount?: string;
  brokerageFee?: string;
  totalOwed: string;
  currency: BankAccountCurrency;
}

/**
 * Creates (or, if one is already outstanding for this shipment, revises in
 * place) the duties/customs invoice for a shipment placed on customs hold.
 * A paid duties invoice is never overwritten by a later re-assessment.
 */
export async function createInvoiceForDuties(
  shipment: IShipment,
  duties: DutiesAssessment
): Promise<IInvoice> {
  await connectDB();

  const lineItems: { description: string; amount: number }[] = [];
  if (duties.dutiesAmount) {
    lineItems.push({ description: "Customs Duty", amount: parseAmount(duties.dutiesAmount) });
  }
  if (duties.taxesAmount) {
    lineItems.push({ description: "GST / HST Taxes", amount: parseAmount(duties.taxesAmount) });
  }
  if (duties.brokerageFee) {
    lineItems.push({ description: "Broker Filing Fee", amount: parseAmount(duties.brokerageFee) });
  }
  if (lineItems.length === 0) {
    lineItems.push({ description: "Customs Duties & Taxes", amount: parseAmount(duties.totalOwed) });
  }

  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const total = duties.totalOwed ? parseAmount(duties.totalOwed) : subtotal;
  const bankAccount = await getDefaultBankAccount(duties.currency);
  const bankSnapshot = bankAccount
    ? {
        bankName: bankAccount.bankName,
        beneficiaryName: bankAccount.beneficiaryName,
        accountNumber: bankAccount.accountNumber,
        transitNumber: bankAccount.transitNumber || "",
        institutionNumber: bankAccount.institutionNumber || "",
        swiftBic: bankAccount.swiftBic || "",
        bankAddress: bankAccount.bankAddress || "",
        currency: duties.currency,
      }
    : undefined;

  const existing = await Invoice.findOne({ shipmentTrackingNumber: shipment.trackingNumber, kind: "duties" });
  if (existing) {
    if (existing.status === "paid") return existing;

    existing.currency = duties.currency;
    existing.lineItems = lineItems;
    existing.subtotal = subtotal;
    existing.total = total;
    existing.amountDisplay = formatAmount(total, duties.currency);
    existing.bankSnapshot = bankSnapshot;
    existing.status = "unpaid";
    existing.paymentRejectionReason = "";
    await existing.save();
    return existing;
  }

  const issueDate = new Date().toISOString();
  const invoice = await Invoice.create({
    invoiceNumber: generateInvoiceNumber(),
    kind: "duties",
    quoteRefNumber: shipment.quoteId || shipment.trackingNumber,
    shipmentTrackingNumber: shipment.trackingNumber,
    client: {
      name: shipment.client.name,
      companyName: shipment.client.companyName || "",
      email: shipment.client.email,
      phone: shipment.client.phone || "",
      userId: shipment.client.userId || "",
    },
    route: {
      origin: shipment.route?.origin || "",
      destination: shipment.route?.destination || "",
    },
    currency: duties.currency,
    lineItems,
    subtotal,
    total,
    amountDisplay: formatAmount(total, duties.currency),
    status: "unpaid",
    issueDate,
    dueDate: addDays(issueDate, 15),
    bankSnapshot,
  });

  return invoice;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Renders a formatted, one-page invoice PDF on demand. Never persisted —
 * always reflects the invoice's own stored bankSnapshot/line items.
 */
export async function renderInvoicePdf(invoice: IInvoice): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const navy = rgb(0x0b / 255, 0x25 / 255, 0x45 / 255);
  const red = rgb(0xd2 / 255, 0x1f / 255, 0x27 / 255);
  const slate = rgb(0x33 / 255, 0x41 / 255, 0x55 / 255);
  const lightSlate = rgb(0x64 / 255, 0x74 / 255, 0x8b / 255);
  const borderGray = rgb(0xe2 / 255, 0xe8 / 255, 0xf0 / 255);

  let y = height - 60;

  // Header band
  page.drawRectangle({ x: 0, y: height - 100, width, height: 100, color: navy });
  page.drawText("TRANSIMEX", { x: 50, y: height - 55, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText("CANADA LOGISTICS INC.", { x: 50, y: height - 72, size: 9, font: fontBold, color: red });
  page.drawText("INVOICE", { x: width - 160, y: height - 55, size: 22, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText(invoice.invoiceNumber, { x: width - 160, y: height - 72, size: 10, font: fontRegular, color: rgb(1, 1, 1) });

  y = height - 130;
  page.drawText("BILL TO", { x: 50, y, size: 9, font: fontBold, color: lightSlate });
  y -= 16;
  page.drawText(invoice.client.name, { x: 50, y, size: 11, font: fontBold, color: slate });
  if (invoice.client.companyName) {
    y -= 14;
    page.drawText(invoice.client.companyName, { x: 50, y, size: 10, font: fontRegular, color: slate });
  }
  y -= 14;
  page.drawText(invoice.client.email, { x: 50, y, size: 10, font: fontRegular, color: lightSlate });

  const metaX = width - 220;
  let metaY = height - 130;
  const metaRow = (label: string, value: string) => {
    page.drawText(label, { x: metaX, y: metaY, size: 9, font: fontBold, color: lightSlate });
    page.drawText(value, { x: metaX + 90, y: metaY, size: 9, font: fontRegular, color: slate });
    metaY -= 16;
  };
  metaRow("Issue Date:", fmtDate(invoice.issueDate));
  metaRow("Due Date:", fmtDate(invoice.dueDate));
  if (invoice.kind === "duties") {
    metaRow("Type:", "Customs Duties & Taxes");
  } else {
    metaRow("Quote Ref:", invoice.quoteRefNumber);
  }
  metaRow("Shipment:", invoice.shipmentTrackingNumber);
  if (invoice.route?.origin) {
    metaRow("Route:", `${invoice.route.origin} -> ${invoice.route.destination}`);
  }

  y = Math.min(y, metaY) - 30;

  // Line items table header
  page.drawRectangle({ x: 50, y: y - 4, width: width - 100, height: 22, color: rgb(0.96, 0.97, 0.98) });
  page.drawText("DESCRIPTION", { x: 58, y: y + 3, size: 9, font: fontBold, color: navy });
  page.drawText("AMOUNT", { x: width - 140, y: y + 3, size: 9, font: fontBold, color: navy });
  y -= 26;

  for (const item of invoice.lineItems || []) {
    page.drawText(item.description, { x: 58, y, size: 10, font: fontRegular, color: slate });
    const amtText = formatAmount(item.amount, invoice.currency);
    page.drawText(amtText, { x: width - 140, y, size: 10, font: fontRegular, color: slate });
    y -= 20;
    page.drawLine({ start: { x: 50, y: y + 12 }, end: { x: width - 50, y: y + 12 }, thickness: 0.5, color: borderGray });
  }

  y -= 10;
  page.drawLine({ start: { x: width - 220, y: y + 14 }, end: { x: width - 50, y: y + 14 }, thickness: 1, color: navy });
  page.drawText("TOTAL DUE", { x: width - 220, y, size: 11, font: fontBold, color: navy });
  page.drawText(formatAmount(invoice.total, invoice.currency), {
    x: width - 140,
    y,
    size: 11,
    font: fontBold,
    color: red,
  });

  y -= 50;

  // Payment instructions box
  const boxTop = y;
  const boxHeight = 118;
  page.drawRectangle({
    x: 50,
    y: boxTop - boxHeight,
    width: width - 100,
    height: boxHeight,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: borderGray,
    borderWidth: 1,
  });
  let by = boxTop - 18;
  page.drawText("WIRE / EFT PAYMENT INSTRUCTIONS", { x: 62, y: by, size: 9.5, font: fontBold, color: navy });
  by -= 18;

  const bank = invoice.bankSnapshot;
  if (bank) {
    const bankRow = (label: string, value?: string) => {
      if (!value) return;
      page.drawText(`${label}:`, { x: 62, y: by, size: 9, font: fontBold, color: lightSlate });
      page.drawText(value, { x: 62 + 120, y: by, size: 9, font: fontRegular, color: slate });
      by -= 15;
    };
    bankRow("Bank", bank.bankName);
    bankRow("Beneficiary", bank.beneficiaryName);
    bankRow("Account No.", bank.accountNumber);
    bankRow("Transit No.", bank.transitNumber);
    bankRow("Institution No.", bank.institutionNumber);
    bankRow("SWIFT / BIC", bank.swiftBic);
  } else {
    page.drawText("Contact accounts@transimex-canada.com for current wire instructions.", {
      x: 62,
      y: by,
      size: 9,
      font: fontRegular,
      color: lightSlate,
    });
  }

  page.drawText(
    "Institutional Logistics & Cross-Border CBSA/PIP Compliance. This is a system-generated invoice.",
    { x: 50, y: 40, size: 8, font: fontRegular, color: lightSlate }
  );

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
