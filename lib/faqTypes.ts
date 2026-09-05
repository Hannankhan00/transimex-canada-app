export type FaqCategory = "Customs" | "Tracking" | "Billing" | "Operations";

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: {
    en: string;
    fr: string;
  };
  answer: {
    en: string;
    fr: string;
  };
  order: number;
}

/** Maps a Mongoose Faq document (or lean object) to the view shape the admin UI expects. */
export function toFaqItem(doc: any): FaqItem {
  return {
    id: doc._id.toString(),
    category: doc.category,
    question: {
      en: doc.question?.en || "",
      fr: doc.question?.fr || "",
    },
    answer: {
      en: doc.answer?.en || "",
      fr: doc.answer?.fr || "",
    },
    order: typeof doc.order === "number" ? doc.order : 0,
  };
}
