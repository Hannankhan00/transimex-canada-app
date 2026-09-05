export type DocumentType =
  | "Bill of Lading"
  | "Air Waybill"
  | "Rail Waybill"
  | "Proof of Delivery"
  | "Customs Entry"
  | "Commercial Invoice";

export interface VaultDocument {
  id: string;
  name: string;
  type: DocumentType;
  shipmentId: string;
  dateUploaded: string;
  size: string;
  isClientVisible: boolean; // SECURITY: if false, NEVER rendered in client portal
  statusText: string;
  customsPars?: string;
}
