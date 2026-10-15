import { isValidObjectId } from "mongoose";
import connectDB from "@/lib/mongoose";
import User from "@/models/User";
import ExpressAccount from "@/models/ExpressAccount";
import ExpressShipment from "@/models/ExpressShipment";
import { notifyUser } from "@/lib/notifications";
import { sendExpressShipmentEmail, type ExpressShipmentEmailKind } from "@/lib/expressEmail";

const TEXT: Record<ExpressShipmentEmailKind, { en: [string, string]; fr: [string, string] }> = {
  payment_received: {
    en: ["Payment received", "We received your payment and are creating your DHL label."],
    fr: ["Paiement reçu", "Nous avons reçu votre paiement et créons votre étiquette DHL."],
  },
  label_ready: {
    en: ["Label ready", "Your DHL label and tracking number are ready."],
    fr: ["Étiquette prête", "Votre étiquette DHL et votre numéro de suivi sont prêts."],
  },
  cancelled: {
    en: ["Booking cancelled", "Your Express booking was cancelled."],
    fr: ["Réservation annulée", "Votre réservation Express a été annulée."],
  },
  refunded: {
    en: ["Refund issued", "A refund was issued to your card."],
    fr: ["Remboursement émis", "Un remboursement a été émis sur votre carte."],
  },
  in_transit: {
    en: ["On its way", "DHL picked up your parcel and it is in transit."],
    fr: ["En route", "DHL a pris en charge votre colis et il est en transit."],
  },
  out_for_delivery: {
    en: ["Out for delivery", "Your parcel is with the DHL courier."],
    fr: ["En cours de livraison", "Votre colis est avec le livreur DHL."],
  },
  delivered: {
    en: ["Delivered", "DHL reports that your parcel was delivered."],
    fr: ["Livré", "DHL indique que votre colis a été livré."],
  },
  delivery_exception: {
    en: ["Delivery issue", "DHL reported an issue with your parcel. Open the shipment for details."],
    fr: ["Problème de livraison", "DHL a signalé un problème avec votre colis. Ouvrez l'envoi pour les détails."],
  },
  returned: {
    en: ["Being returned", "DHL is returning your parcel to the sender."],
    fr: ["Retourné", "DHL retourne votre colis à l'expéditeur."],
  },
};

/**
 * Tells the client about a status change: always an in-app notification, plus
 * an email in their language when Express emails are enabled. Best effort: it
 * never throws, so a notification problem cannot undo a payment or a label.
 */
export async function notifyShipmentEvent(shipmentId: string, kind: ExpressShipmentEmailKind, detail?: string): Promise<void> {
  try {
    await connectDB();
    const shipment = await ExpressShipment.findById(shipmentId).select("userId reference accountId").lean();
    if (!shipment) return;

    const [account, user] = await Promise.all([
      isValidObjectId(shipment.accountId) ? ExpressAccount.findById(shipment.accountId).select("language contactName").lean() : null,
      isValidObjectId(shipment.userId) ? User.findById(shipment.userId).select("name email").lean<any>() : null,
    ]);

    const [titleEn, descEn] = TEXT[kind].en;
    const [titleFr, descFr] = TEXT[kind].fr;
    await notifyUser({
      userId: shipment.userId,
      title: `${titleEn} · ${shipment.reference}`,
      titleFr: `${titleFr} · ${shipment.reference}`,
      desc: detail || descEn,
      descFr: detail || descFr,
      category: "transit",
      link: `/express/shipments/${shipmentId}`,
    });

    if (user?.email) {
      await sendExpressShipmentEmail({
        to: user.email,
        name: account?.contactName || user.name,
        language: account?.language || "en",
        kind,
        reference: shipment.reference,
        shipmentId,
        detail,
      });
    }
  } catch (error) {
    console.warn("[Express] Shipment notification failed:", error);
  }
}
