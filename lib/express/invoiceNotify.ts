import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressInvoice from "@/models/ExpressInvoice";
import { notifyUser } from "@/lib/notifications";
import { sendExpressInvoiceEmail, type ExpressInvoiceEmailKind } from "@/lib/expressEmail";

const TEXT: Record<ExpressInvoiceEmailKind, { en: [string, string]; fr: [string, string] }> = {
  issued: {
    en: ["New invoice", "A new Express invoice is ready."],
    fr: ["Nouvelle facture", "Une nouvelle facture Express est prête."],
  },
  overdue: {
    en: ["Invoice overdue", "This invoice is overdue. New bookings on credit are paused until it is paid."],
    fr: ["Facture en retard", "Cette facture est en retard. Les nouvelles réservations à crédit sont suspendues jusqu'au paiement."],
  },
  paid: {
    en: ["Invoice paid", "Your invoice is paid. Thank you."],
    fr: ["Facture payée", "Votre facture est payée. Merci."],
  },
};

/**
 * Tells the account owner about an invoice: always an in-app notification, plus
 * an email when Express emails are enabled. Best effort: it never throws, so a
 * notification problem cannot undo an invoice or a payment.
 */
export async function notifyInvoiceEvent(invoiceId: string, kind: ExpressInvoiceEmailKind): Promise<void> {
  try {
    await connectDB();
    const invoice = await ExpressInvoice.findById(invoiceId).select("userId accountId number totalCents dueAt").lean();
    if (!invoice) return;

    const [account, user] = await Promise.all([
      isValidObjectId(invoice.accountId) ? ExpressAccount.findById(invoice.accountId).select("language contactName").lean() : null,
      isValidObjectId(invoice.userId) ? User.findById(invoice.userId).select("name email").lean<any>() : null,
    ]);

    const [titleEn, descEn] = TEXT[kind].en;
    const [titleFr, descFr] = TEXT[kind].fr;
    await notifyUser({
      userId: invoice.userId,
      title: `${titleEn} · ${invoice.number}`,
      titleFr: `${titleFr} · ${invoice.number}`,
      desc: descEn,
      descFr,
      category: "system",
      link: `/express/invoices/${invoiceId}`,
    });

    if (user?.email) {
      await sendExpressInvoiceEmail({
        to: user.email,
        name: account?.contactName || user.name,
        language: account?.language || "en",
        kind,
        number: invoice.number,
        invoiceId,
        totalCents: invoice.totalCents,
        dueAt: invoice.dueAt,
      });
    }
  } catch (error) {
    console.warn("[Express] Invoice notification failed:", error);
  }
}
