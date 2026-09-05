import { NextResponse } from "next/server";
import connectDB from "@/lib/mongoose";
import EmailTemplate from "@/models/EmailTemplate";

const SEED_EMAIL_TEMPLATES = [
  {
    slug: "quote-accepted",
    name: "Quote Accepted & Converted to Shipment",
    description:
      "Fires when operations accepts a quote request and instantiates an active shipment tracking manifest.",
    category: "Quotes" as const,
    subject: {
      en: "Your Freight Quote {{quoteId}} Has Been Accepted - Tracking Manifest {{trackingId}}",
      fr: "Votre soumission {{quoteId}} a été acceptée - Manifeste de suivi {{trackingId}}",
    },
    heading: {
      en: "Shipment Activated & Carrier Assigned",
      fr: "Expédition activée et transporteur assigné",
    },
    body: {
      en: "Dear {{clientName}},\n\nWe are pleased to inform you that freight request {{quoteId}} for corridor {{origin}} to {{destination}} has been assigned a confirmed rate of {{rate}}. Your live shipment is now accessible in the client portal under tracking reference {{trackingId}}.\n\nEstimated arrival time: {{eta}}.",
      fr: "Cher(ère) {{clientName}},\n\nNous avons le plaisir de vous informer que votre soumission {{quoteId}} pour le corridor {{origin}} vers {{destination}} a été confirmée au tarif de {{rate}}. Votre expédition en direct est maintenant accessible avec la référence {{trackingId}}.\n\nArrivée estimée : {{eta}}.",
    },
    placeholders: ["{{clientName}}", "{{quoteId}}", "{{trackingId}}", "{{origin}}", "{{destination}}", "{{rate}}", "{{eta}}", "{{portalUrl}}"],
  },
  {
    slug: "quote-rejected",
    name: "Quote Declined / Capacity Notice",
    description:
      "Sent to shippers when an incoming quote is declined due to capacity constraints or equipment unavailability.",
    category: "Quotes" as const,
    subject: {
      en: "Update regarding your Transimex quote request {{quoteId}}",
      fr: "Mise à jour concernant votre demande de soumission {{quoteId}}",
    },
    heading: {
      en: "Freight Request Evaluation Notice",
      fr: "Avis d'évaluation de la demande de fret",
    },
    body: {
      en: "Dear {{clientName}},\n\nThank you for requesting freight services with Transimex Canada. Due to {{rejectionReason}}, we are currently unable to service requested route {{origin}} to {{destination}}.\n\nOur logistics specialists remain at your disposal for alternative corridors.",
      fr: "Cher(ère) {{clientName}},\n\nMerci pour votre demande de transport. En raison de {{rejectionReason}}, nous ne pouvons actuellement pas desservir le corridor {{origin}} vers {{destination}}.\n\nNos spécialistes demeurent à votre disposition pour d'autres options.",
    },
    placeholders: ["{{clientName}}", "{{quoteId}}", "{{origin}}", "{{destination}}", "{{rejectionReason}}"],
  },
  {
    slug: "customs-duties",
    name: "Customs Duties & Regulatory Assessment Notice",
    description:
      "Urgent transactional alert to corporate clients specifying assessed CBSA customs duties and taxes.",
    category: "Customs" as const,
    subject: {
      en: "URGENT: Customs Duties & Tax Assessment for Shipment {{trackingId}}",
      fr: "URGENT : Évaluation des droits de douane et taxes pour l'envoi {{trackingId}}",
    },
    heading: {
      en: "CBSA Clearance Duties Assessment",
      fr: "Évaluation des droits de dédouanement de l'ASFC",
    },
    body: {
      en: "Dear {{clientName}},\n\nCBSA customs brokers have assessed import tariff duties and taxes on shipment {{trackingId}} for a total amount of {{totalOwed}}.\n\nPlease remit settlement immediately in your client portal to permit cargo release.",
      fr: "Cher(ère) {{clientName}},\n\nL'ASFC a calculé les droits de douane et taxes pour l'envoi {{trackingId}} pour un montant total de {{totalOwed}}.\n\nVeuillez procéder au règlement pour autoriser la mainlevée des marchandises.",
    },
    placeholders: ["{{clientName}}", "{{trackingId}}", "{{totalOwed}}", "{{portOfEntry}}", "{{portalUrl}}"],
  },
  {
    slug: "shipment-delivered",
    name: "Proof of Delivery (POD) & Arrival Confirmation",
    description: "Dispatched upon driver or rail terminal signoff verifying safe final cargo receipt.",
    category: "Shipments" as const,
    subject: {
      en: "Delivered: Shipment {{trackingId}} Completed & POD Released",
      fr: "Livré : Envoi {{trackingId}} terminé et preuve de livraison émise",
    },
    heading: {
      en: "Cargo Successfully Delivered",
      fr: "Marchandise livrée avec succès",
    },
    body: {
      en: "Dear {{clientName}},\n\nWe confirm that shipment {{trackingId}} was safely received at destination facility {{destination}}.\n\nThe certified Proof of Delivery (POD) has been archived into your Document Vault.",
      fr: "Cher(ère) {{clientName}},\n\nNous confirmons que l'envoi {{trackingId}} a été livré en toute sécurité à destination ({{destination}}).\n\nLa preuve de livraison (POD) certifiée est disponible dans votre Coffre-fort.",
    },
    placeholders: ["{{clientName}}", "{{trackingId}}", "{{destination}}", "{{deliveryTime}}", "{{portalUrl}}"],
  },
  {
    slug: "support-update",
    name: "Support Ticket Staff Response",
    description: "Sent to the client whenever a dispatcher responds to an authenticated helpdesk inquiry.",
    category: "Support" as const,
    subject: {
      en: "[{{ticketId}}] New Response on Your Support Request",
      fr: "[{{ticketId}}] Nouvelle réponse à votre demande d'assistance",
    },
    heading: {
      en: "Dispatcher Response Received",
      fr: "Réponse du répartiteur reçue",
    },
    body: {
      en: "Dear {{clientName}},\n\nA member of our logistics support staff has replied to ticket {{ticketId}} regarding {{subject}}.\n\nLatest message: {{latestMessage}}",
      fr: "Cher(ère) {{clientName}},\n\nUn membre de notre équipe a répondu au billet {{ticketId}} concernant {{subject}}.\n\nDernier message : {{latestMessage}}",
    },
    placeholders: ["{{clientName}}", "{{ticketId}}", "{{subject}}", "{{latestMessage}}", "{{portalUrl}}"],
  },
];

export async function GET() {
  try {
    await connectDB();

    if ((await EmailTemplate.countDocuments()) === 0) {
      await EmailTemplate.insertMany(SEED_EMAIL_TEMPLATES);
    }

    const templates = await EmailTemplate.find().sort({ category: 1, name: 1 }).lean();

    return NextResponse.json({
      success: true,
      templates: templates.map((t: any) => ({ ...t, id: t._id.toString() })),
    });
  } catch (error: any) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch email templates" },
      { status: 500 }
    );
  }
}
