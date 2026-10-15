import type { CarrierAdapter } from "./core/adapter";
import type { CarrierId } from "./core/types";
import { createDhlAdapter } from "./carriers/dhl";

let dhlAdapter: CarrierAdapter | null = null;

/** Single entry point for core code to obtain a carrier adapter. */
export function getCarrierAdapter(carrier: CarrierId = "dhl"): CarrierAdapter {
  switch (carrier) {
    case "dhl":
      // Cached so the mock keeps its in-memory tracking state between calls.
      dhlAdapter ??= createDhlAdapter();
      return dhlAdapter;
  }
}
