/**
 * The extra questions a business (B2B) applicant answers so staff can decide whether to
 * approve the account, and on what terms. One definition feeds the application popup, the
 * server validation and the staff screens, so a question and its answers never drift apart.
 */

export type Lang = "en" | "fr";
export interface L {
  en: string;
  fr: string;
}

export const CATEGORY_VALUES = ["clothing", "electronics", "food", "cosmetics", "documents", "auto_parts", "industrial", "household", "books", "other"] as const;
export const SHIPS_FOR_VALUES = ["own", "clients", "both"] as const;
export const CLIENT_COUNT_VALUES = ["1_5", "6_20", "21_50", "50_plus"] as const;
export const WEIGHT_VALUES = ["light", "medium", "heavy", "mixed"] as const;
export const VALUE_VALUES = ["under_100", "100_500", "500_2000", "over_2000"] as const;
export const RESTRICTED_VALUES = ["batteries", "liquids", "food", "medicines", "plants", "dangerous", "none"] as const;
export const PAYMENT_VALUES = ["pay_at_booking", "weekly_invoice"] as const;

export type Category = (typeof CATEGORY_VALUES)[number];
export type ShipsFor = (typeof SHIPS_FOR_VALUES)[number];
export type ClientCount = (typeof CLIENT_COUNT_VALUES)[number];
export type TypicalWeight = (typeof WEIGHT_VALUES)[number];
export type TypicalValue = (typeof VALUE_VALUES)[number];
export type Restricted = (typeof RESTRICTED_VALUES)[number];
export type PaymentPreference = (typeof PAYMENT_VALUES)[number];

export interface ShippingProfile {
  categories: Category[];
  goodsDescription: string;
  shipsFor: ShipsFor;
  /** Only when they ship for clients. */
  clientCount?: ClientCount;
  clientsDescription?: string;
  destinations: string;
  typicalWeight: TypicalWeight;
  typicalValue: TypicalValue;
  restrictedGoods: Restricted[];
  currentCarriers?: string;
  paymentPreference: PaymentPreference;
  businessNumber?: string;
  website?: string;
}

export const OPTIONS = {
  categories: {
    clothing: { en: "Clothing and textiles", fr: "Vêtements et textiles" },
    electronics: { en: "Electronics and phones", fr: "Électronique et téléphones" },
    food: { en: "Food and drinks", fr: "Aliments et boissons" },
    cosmetics: { en: "Cosmetics and health products", fr: "Cosmétiques et produits de santé" },
    documents: { en: "Documents", fr: "Documents" },
    auto_parts: { en: "Auto parts", fr: "Pièces automobiles" },
    industrial: { en: "Machinery and industrial goods", fr: "Machinerie et produits industriels" },
    household: { en: "Household goods", fr: "Articles ménagers" },
    books: { en: "Books and printed material", fr: "Livres et imprimés" },
    other: { en: "Something else", fr: "Autre chose" },
  } satisfies Record<Category, L>,
  shipsFor: {
    own: { en: "Only my own business", fr: "Seulement ma propre entreprise" },
    clients: { en: "For my clients (I ship on their behalf)", fr: "Pour mes clients (j'expédie en leur nom)" },
    both: { en: "Both my own goods and my clients'", fr: "Mes propres marchandises et celles de mes clients" },
  } satisfies Record<ShipsFor, L>,
  clientCount: {
    "1_5": { en: "1 to 5", fr: "1 à 5" },
    "6_20": { en: "6 to 20", fr: "6 à 20" },
    "21_50": { en: "21 to 50", fr: "21 à 50" },
    "50_plus": { en: "More than 50", fr: "Plus de 50" },
  } satisfies Record<ClientCount, L>,
  typicalWeight: {
    light: { en: "Under 5 kg", fr: "Moins de 5 kg" },
    medium: { en: "5 to 20 kg", fr: "5 à 20 kg" },
    heavy: { en: "20 to 70 kg", fr: "20 à 70 kg" },
    mixed: { en: "A mix of sizes", fr: "Un mélange de tailles" },
  } satisfies Record<TypicalWeight, L>,
  typicalValue: {
    under_100: { en: "Under $100", fr: "Moins de 100 $" },
    "100_500": { en: "$100 to $500", fr: "100 $ à 500 $" },
    "500_2000": { en: "$500 to $2,000", fr: "500 $ à 2 000 $" },
    over_2000: { en: "Over $2,000", fr: "Plus de 2 000 $" },
  } satisfies Record<TypicalValue, L>,
  restrictedGoods: {
    batteries: { en: "Batteries", fr: "Piles et batteries" },
    liquids: { en: "Liquids", fr: "Liquides" },
    food: { en: "Food or perishable items", fr: "Aliments ou produits périssables" },
    medicines: { en: "Medicines", fr: "Médicaments" },
    plants: { en: "Plants or seeds", fr: "Plantes ou semences" },
    dangerous: { en: "Other dangerous goods", fr: "Autres marchandises dangereuses" },
    none: { en: "None of these", fr: "Aucun de ceux-ci" },
  } satisfies Record<Restricted, L>,
  paymentPreference: {
    pay_at_booking: { en: "Pay by card when I book", fr: "Payer par carte à la réservation" },
    weekly_invoice: { en: "Weekly invoice (credit, subject to approval)", fr: "Facture hebdomadaire (crédit, sous réserve d'approbation)" },
  } satisfies Record<PaymentPreference, L>,
};

export const QUESTIONS = {
  intro: { en: "A few questions about your business help our team review your application faster.", fr: "Quelques questions sur votre entreprise aident notre équipe à examiner votre demande plus vite." },
  categories: { en: "What do you ship?", fr: "Qu'expédiez-vous?" },
  categoriesHint: { en: "Choose all that apply.", fr: "Choisissez tout ce qui s'applique." },
  goodsDescription: { en: "Describe your typical items", fr: "Décrivez vos articles habituels" },
  goodsDescriptionHint: { en: "For example: women's clothing, phone accessories, spare parts for trucks.", fr: "Par exemple : vêtements pour femmes, accessoires de téléphone, pièces de camion." },
  shipsFor: { en: "Who do you ship for?", fr: "Pour qui expédiez-vous?" },
  clientCount: { en: "About how many clients do you ship for?", fr: "Pour environ combien de clients expédiez-vous?" },
  clientsDescription: { en: "Who are your clients? (optional)", fr: "Qui sont vos clients? (facultatif)" },
  clientsDescriptionHint: { en: "For example: small shops, families sending parcels home, other businesses.", fr: "Par exemple : petits commerces, familles qui envoient des colis, autres entreprises." },
  destinations: { en: "Main destination countries in Africa", fr: "Principaux pays de destination en Afrique" },
  destinationsHint: { en: "For example: Cameroon, Ivory Coast, Senegal.", fr: "Par exemple : Cameroun, Côte d'Ivoire, Sénégal." },
  typicalWeight: { en: "Typical parcel weight", fr: "Poids habituel d'un colis" },
  typicalValue: { en: "Typical value of a shipment", fr: "Valeur habituelle d'un envoi" },
  restrictedGoods: { en: "Do you ship any of these?", fr: "Expédiez-vous l'un de ces articles?" },
  restrictedHint: { en: "Some of these need special handling or are not accepted by DHL.", fr: "Certains demandent une manipulation spéciale ou ne sont pas acceptés par DHL." },
  paymentPreference: { en: "How would you like to pay?", fr: "Comment souhaitez-vous payer?" },
  currentCarriers: { en: "Which carriers do you use today? (optional)", fr: "Quels transporteurs utilisez-vous aujourd'hui? (facultatif)" },
  businessNumber: { en: "Business registration number (optional)", fr: "Numéro d'enregistrement de l'entreprise (facultatif)" },
  website: { en: "Website (optional)", fr: "Site Web (facultatif)" },
  chooseOne: { en: "Choose one", fr: "Choisissez" },
} satisfies Record<string, L>;

type Group = keyof typeof OPTIONS;

/** The label of one answer, in the viewer's language. Unknown values are shown as they are. */
export function optionLabel(group: Group, value: string, lang: Lang): string {
  const entry = (OPTIONS[group] as Record<string, L>)[value];
  return entry ? entry[lang] : value;
}

export const q = (key: keyof typeof QUESTIONS, lang: Lang) => QUESTIONS[key][lang];
