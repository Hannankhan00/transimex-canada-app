export type InquiryCategory =
  | "General Inquiry"
  | "Freight Quote"
  | "Partnership"
  | "Customs Clearance";

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  subject: string;
  category: InquiryCategory;
  message: string;
  date: string;
  timestamp: string;
  unread: boolean;
  replied: boolean;
  reply?: {
    text: string;
    repliedAt: string;
    repliedBy: string;
  };
}

/** Maps a Mongoose Inquiry document (or lean object) to the view shape the admin UI expects. */
export function toContactInquiry(doc: any): ContactInquiry {
  const createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();

  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone || "",
    company: doc.company || "",
    subject: doc.subject,
    category: doc.category,
    message: doc.message,
    date: createdAt.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    timestamp: createdAt.toISOString(),
    unread: !!doc.unread,
    replied: !!doc.replied,
    reply: doc.reply
      ? {
          text: doc.reply.text || "",
          repliedAt: doc.reply.repliedAt
            ? new Date(doc.reply.repliedAt).toISOString()
            : "",
          repliedBy: doc.reply.repliedBy || "",
        }
      : undefined,
  };
}
