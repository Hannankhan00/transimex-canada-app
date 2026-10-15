import { deleteFromR2, getR2PresignedDownloadUrl, uploadToR2 } from "@/lib/r2";

/** Where shipping labels live. Labels are private: only short-lived signed links, issued after an owner check. */
export interface LabelStore {
  put(key: string, pdf: Buffer): Promise<void>;
  /** A short-lived download link, or null when the object cannot be linked. */
  signedUrl(key: string, seconds: number): Promise<string | null>;
  remove(key: string): Promise<void>;
}

export const labelKey = (shipmentId: string) => `express/labels/${shipmentId}/label.pdf`;

/** A label link is valid for two minutes: long enough to start the download, too short to share. */
export const LABEL_LINK_SECONDS = 120;

export const r2LabelStore: LabelStore = {
  async put(key, pdf) {
    await uploadToR2({ key, buffer: pdf, mimeType: "application/pdf", cacheControl: "private, no-store" });
  },
  signedUrl: (key, seconds) => getR2PresignedDownloadUrl(key, seconds),
  async remove(key) {
    await deleteFromR2(key);
  },
};

/** True for a real PDF. Staff uploads are checked, never trusted by file name. */
export function isPdf(buffer: Buffer): boolean {
  return buffer.length > 8 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}
