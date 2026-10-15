/**
 * Express terms of service shown at application time.
 *
 * DRAFT wording: it repeats the DHL policies Transimex follows, in plain
 * language, so no charge comes as a surprise. It must be reviewed against the
 * signed DHL contract (and by whoever handles legal review) before launch.
 * Bump TERMS_VERSION whenever the text changes; the accepted version and date
 * are stored on every account.
 */
export const TERMS_VERSION = "2026-10-draft-1";

export interface TermsSection {
  title: string;
  body: string;
}

export const TERMS: Record<"en" | "fr", { heading: string; intro: string; sections: TermsSection[] }> = {
  en: {
    heading: "Transimex Express Terms of Service",
    intro:
      "Transimex Express resells DHL Express shipping from Canada to Africa. DHL's own policies apply to every shipment, and we do not hide them. By applying you agree to the following.",
    sections: [
      {
        title: "Weight and size corrections",
        body: "If DHL measures a parcel heavier or larger than declared, DHL bills Transimex later, sometimes weeks after delivery. We pass the difference on to you, and you agree to pay it.",
      },
      {
        title: "Returns and undeliverable parcels",
        body: "DHL's return and undeliverable-parcel policy applies, including refused parcels. DHL's charges for returns or disposal are passed through to you.",
      },
      {
        title: "Duties and taxes",
        body: "At booking you choose who pays duties and taxes: the recipient on delivery (DHL's default) or the sender. If the sender pays, DHL bills Transimex after customs clearance and we charge you the amount afterwards. Transimex never bears duties and taxes.",
      },
      {
        title: "Customs information",
        body: "You are responsible for accurate customs details for every item: description, tariff (HS) code, quantity, value, country of origin and reason for export. Incorrect information can cause delays, fines or extra charges that are passed to you.",
      },
      {
        title: "Lost or damaged parcels",
        body: "DHL's claims process and declared-value limits apply. Transimex files the claim with DHL and passes the outcome on to you.",
      },
      {
        title: "Pickup",
        body: "You may choose DHL pickup, which carries a fee that you pay, or drop off the parcel at a DHL service point at no extra fee.",
      },
      {
        title: "Prices and payment",
        body: "Prices are in Canadian dollars. A quote is saved when you confirm it and does not change afterwards, except through a DHL weight or size correction. Surcharges such as fuel and remote-area fees are passed through at DHL's amount.",
      },
    ],
  },
  fr: {
    heading: "Conditions d'utilisation de Transimex Express",
    intro:
      "Transimex Express revend les services d'expédition DHL Express du Canada vers l'Afrique. Les politiques de DHL s'appliquent à chaque envoi et nous ne les cachons pas. En faisant une demande, vous acceptez ce qui suit.",
    sections: [
      {
        title: "Corrections de poids et de dimensions",
        body: "Si DHL mesure un colis plus lourd ou plus grand que déclaré, DHL facture Transimex plus tard, parfois des semaines après la livraison. Nous vous transmettons la différence et vous acceptez de la payer.",
      },
      {
        title: "Retours et colis non livrables",
        body: "La politique de DHL sur les retours et les colis non livrables s'applique, y compris les colis refusés. Les frais de DHL pour les retours ou la destruction vous sont transmis.",
      },
      {
        title: "Droits et taxes",
        body: "À la réservation, vous choisissez qui paie les droits et taxes : le destinataire à la livraison (option par défaut de DHL) ou l'expéditeur. Si l'expéditeur paie, DHL facture Transimex après le dédouanement et nous vous facturons ensuite le montant. Transimex n'assume jamais les droits et taxes.",
      },
      {
        title: "Renseignements douaniers",
        body: "Vous êtes responsable de l'exactitude des renseignements douaniers pour chaque article : description, code tarifaire (SH), quantité, valeur, pays d'origine et motif d'exportation. Des renseignements inexacts peuvent causer des retards, des amendes ou des frais supplémentaires qui vous sont transmis.",
      },
      {
        title: "Colis perdus ou endommagés",
        body: "Le processus de réclamation de DHL et ses limites de valeur déclarée s'appliquent. Transimex dépose la réclamation auprès de DHL et vous transmet le résultat.",
      },
      {
        title: "Ramassage",
        body: "Vous pouvez choisir le ramassage DHL, qui comporte des frais à votre charge, ou déposer le colis dans un point de service DHL sans frais supplémentaires.",
      },
      {
        title: "Prix et paiement",
        body: "Les prix sont en dollars canadiens. Une soumission est enregistrée lorsque vous la confirmez et ne change plus par la suite, sauf en cas de correction de poids ou de dimensions par DHL. Les surcharges, comme le carburant et les zones éloignées, sont transmises au montant de DHL.",
      },
    ],
  },
};
