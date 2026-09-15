import { CarrierCode } from "../schema";
import { CarrierAdapter } from "./types";
import { maerskAdapter } from "./maersk";
import { cmaCgmAdapter } from "./cmacgm";
import { mscAdapter } from "./msc";

const ADAPTERS: Record<CarrierCode, CarrierAdapter> = {
  MAERSK: maerskAdapter,
  CMA_CGM: cmaCgmAdapter,
  MSC: mscAdapter,
};

export function getAdapter(carrier: CarrierCode): CarrierAdapter {
  return ADAPTERS[carrier];
}

export { maerskAdapter, cmaCgmAdapter, mscAdapter };
export type { CarrierAdapter } from "./types";
