export type ClientAccountStatus = "Active" | "Deactivated";

export interface ClientProfile {
  id: string;
  companyName: string;
  primaryContact: string;
  contactTitle?: string;
  email: string;
  phone: string;
  industry: string;
  status: ClientAccountStatus;
  registeredDate: string;
  billingAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  taxId: string;
  paymentTerms: string;
  accountManager: string;
  lifetimeRevenueCad: string;
  totalShipmentsCompleted: number;
  activeQuotesCount: number;
  notes?: string;
}

const INDUSTRY_LABELS: Record<string, string> = {
  Automotive: "Automotive",
  Manufacturing: "Manufacturing",
  Pharma: "Pharmaceutical",
  Retail: "Retail & Consumer",
  Food: "Food & Cold-Chain",
  Industrial: "Industrial & Energy",
  Other: "Other",
};

export function mapUserIndustryToClientIndustry(industry?: string): string {
  if (!industry) return "Other";
  return INDUSTRY_LABELS[industry] || industry;
}
