import { COUNTRIES } from "@/lib/data/countries";

/**
 * Shared promotion types + pure helpers. Used by the admin UI, the admin preview and the
 * public API, so the preview always renders exactly what the website receives.
 */

export type PromoLang = "en" | "fr";

export interface PromoImage {
  url: string;
  width: number;
  height: number;
  bytes?: number;
  originalBytes?: number;
  mediaId?: string;
}

export interface PromoText {
  title: string;
  description: string;
  badge: string;
  ctaLabel: string;
  footer: string;
  imageAlt: string;
}

export interface PromoPlace {
  label: string;
  countryCode: string;
}

/** Promotion as exchanged with the admin UI (ISO strings, no Mongoose types). */
export interface PromotionDTO {
  id: string;
  name: string;
  isActive: boolean;
  priority: number;
  delaySeconds: number;
  startsAt: string | null;
  endsAt: string | null;
  departureDate: string | null;
  destination: { city: string; countryCode: string };
  ports: PromoPlace[];
  showFlags: boolean;
  cta: { url: string };
  image: { en: PromoImage | null; fr: PromoImage | null };
  content: { en: PromoText; fr: PromoText };
  createdAt?: string;
  updatedAt?: string;
}

export type PromotionStatus = "live" | "scheduled" | "expired" | "inactive";

export const EMPTY_TEXT: PromoText = {
  title: "",
  description: "",
  badge: "",
  ctaLabel: "",
  footer: "",
  imageAlt: "",
};

export const PLACEHOLDERS = ["{{destination}}", "{{city}}", "{{country}}", "{{date}}"] as const;

export const LIMITS = {
  title: 120,
  description: 500,
  badge: 80,
  ctaLabel: 40,
  footer: 160,
  imageAlt: 200,
  maxPorts: 12,
  maxDelaySeconds: 600,
} as const;

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function findCountry(code: string | undefined | null) {
  return code ? COUNTRY_BY_CODE.get(code.toUpperCase()) : undefined;
}

export function countryName(code: string | undefined | null, lang: PromoLang): string {
  const c = findCountry(code);
  if (!c) return "";
  return lang === "fr" ? c.nameFr : c.name;
}

export function computeStatus(
  p: Pick<PromotionDTO, "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date()
): PromotionStatus {
  if (!p.isActive) return "inactive";
  if (p.startsAt && new Date(p.startsAt) > now) return "scheduled";
  if (p.endsAt && new Date(p.endsAt) < now) return "expired";
  return "live";
}

/** "2026-10-16" -> "October 16, 2026" / "16 octobre 2026". Date-only, so always formatted in UTC. */
export function formatDepartureDate(date: string | null | undefined, lang: PromoLang): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(d);
}

/** Resolves {{destination}}, {{city}}, {{country}}, {{date}} so key details stay in sync across languages. */
export function resolvePlaceholders(text: string, p: PromotionDTO, lang: PromoLang): string {
  if (!text) return "";
  const city = p.destination.city.trim();
  const country = countryName(p.destination.countryCode, lang);
  const values: Record<string, string> = {
    destination: [city, country].filter(Boolean).join(", "),
    city,
    country,
    date: formatDepartureDate(p.departureDate, lang),
  };
  return text
    .replace(/\{\{\s*(destination|city|country|date)\s*\}\}/gi, (_m, key: string) => values[key.toLowerCase()] ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function flagUrl(code: string | undefined | null, origin: string): string | null {
  const c = findCountry(code);
  return c ? `${origin}/flags/${c.code.toLowerCase()}.svg` : null;
}

function absolute(url: string, origin: string): string {
  return url.startsWith("/") ? `${origin}${url}` : url;
}

function placeView(place: PromoPlace, lang: PromoLang, showFlags: boolean, origin: string) {
  return {
    label: place.label,
    countryCode: place.countryCode || null,
    countryName: place.countryCode ? countryName(place.countryCode, lang) : null,
    flagUrl: showFlags ? flagUrl(place.countryCode, origin) : null,
  };
}

function imageView(img: PromoImage | null | undefined, origin: string) {
  return img ? { url: absolute(img.url, origin), width: img.width, height: img.height } : null;
}

function textView(p: PromotionDTO, l: PromoLang) {
  const c = p.content[l];
  const title = resolvePlaceholders(c.title, p, l);
  return {
    title,
    description: resolvePlaceholders(c.description, p, l),
    badge: resolvePlaceholders(c.badge, p, l),
    ctaLabel: resolvePlaceholders(c.ctaLabel, p, l),
    footer: resolvePlaceholders(c.footer, p, l),
    imageAlt: resolvePlaceholders(c.imageAlt, p, l) || title,
  };
}

function destinationView(p: PromotionDTO, l: PromoLang, origin: string) {
  const { label: _label, ...place } = placeView({ label: p.destination.city, countryCode: p.destination.countryCode }, l, p.showFlags, origin);
  void _label;
  return { city: p.destination.city, ...place };
}

/**
 * The public shape. With `lang` every text field is a plain string already resolved for that
 * language; without it, language-dependent fields are keyed by language ({ en, fr }).
 * `origin` makes image/flag URLs absolute ("" keeps them relative, used by the admin preview).
 */
export function buildPublicPromotion(p: PromotionDTO, lang: PromoLang, origin: string) {
  const { ctaLabel, ...text } = textView(p, lang);
  return {
    id: p.id,
    updatedAt: p.updatedAt ?? null,
    priority: p.priority,
    delaySeconds: p.delaySeconds,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    departureDate: p.departureDate,
    departureDateFormatted: formatDepartureDate(p.departureDate, lang) || null,
    showFlags: p.showFlags,
    destination: destinationView(p, lang, origin),
    ports: p.ports.map((pl) => placeView(pl, lang, p.showFlags, origin)),
    cta: { url: p.cta.url, label: ctaLabel },
    image: imageView(p.image[lang], origin),
    ...text,
  };
}

export type PublicPromotion = ReturnType<typeof buildPublicPromotion>;

/** Both languages in one object, for clients that switch language without refetching. */
export function buildBilingualPromotion(p: PromotionDTO, origin: string) {
  const { en, fr } = { en: buildPublicPromotion(p, "en", origin), fr: buildPublicPromotion(p, "fr", origin) };
  return {
    id: p.id,
    updatedAt: p.updatedAt ?? null,
    priority: p.priority,
    delaySeconds: p.delaySeconds,
    startsAt: p.startsAt,
    endsAt: p.endsAt,
    departureDate: p.departureDate,
    showFlags: p.showFlags,
    en,
    fr,
  };
}
