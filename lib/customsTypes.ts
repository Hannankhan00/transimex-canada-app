export type CustomsClearanceStatus = "Pending" | "In Review" | "Released" | "Held";

export interface CustomsDuties {
  amountCad: string;
  taxGstHst: string;
  brokerageFee: string;
  totalOwed: string;
  status: "Unassessed" | "Notice Dispatched" | "Settled";
  dispatchedAt?: string;
}

export interface CustomsComplianceRecord {
  shipmentId: string;
  status: CustomsClearanceStatus;
  broker: string;
  portOfEntry: string;
  cbsaPars: string;
  cbsaNotes: string;
  duties: CustomsDuties;
  lastUpdated: string;
}
