/**
 * What is inside a shipment, the way DHL separates it: paper documents with no
 * commercial value, or goods. They use different DHL products and different paperwork.
 */
export const CONTENT_TYPES = ["documents", "goods"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** DHL Express Worldwide: D = documents, P = non-documents (parcels). */
export const PRODUCT_CODE: Record<ContentType, string> = { documents: "D", goods: "P" };

/** Used until staff set the real limit from DHL (Express Settings). */
export const DEFAULT_DOCUMENT_MAX_KG = 2;

/** Older records have no content type: they are all goods. */
export const contentTypeOf = (value: unknown): ContentType => (value === "documents" ? "documents" : "goods");

export const productCodeFor = (value: unknown): string => PRODUCT_CODE[contentTypeOf(value)];
