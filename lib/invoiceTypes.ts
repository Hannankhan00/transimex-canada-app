export type InvoiceStatus = "unpaid" | "pending_verification" | "paid";

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

export interface InvoiceBankSnapshot {
  bankName: string;
  beneficiaryName: string;
  accountNumber: string;
  transitNumber?: string;
  institutionNumber?: string;
  swiftBic?: string;
  bankAddress?: string;
  currency: "CAD" | "USD";
}

export interface InvoicePaymentProof {
  fileKey?: string;
  fileUrl?: string;
  storageProvider?: "r2" | "mongodb";
  mimeType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  quoteRefNumber: string;
  shipmentTrackingNumber: string;
  client: {
    name: string;
    companyName?: string;
    email: string;
    phone?: string;
    userId?: string;
  };
  route: {
    origin: string;
    destination: string;
  };
  currency: "CAD" | "USD";
  lineItems: InvoiceLineItem[];
  subtotal: number;
  total: number;
  amountDisplay: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  bankSnapshot?: InvoiceBankSnapshot;
  paymentProof?: InvoicePaymentProof;
  paymentRejectionReason?: string;
  rejectedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}
