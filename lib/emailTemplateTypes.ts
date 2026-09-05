export type EmailTemplateCategory = "Quotes" | "Customs" | "Shipments" | "Support" | "Staff";

export interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: EmailTemplateCategory;
  subject: { en: string; fr: string };
  heading: { en: string; fr: string };
  body: { en: string; fr: string };
  placeholders: string[];
}
