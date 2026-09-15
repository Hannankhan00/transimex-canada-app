import { CarrierCode, ContainerTracking, deriveStatus } from "./schema";
import { detectCarrier as defaultDetectCarrier, CarrierDetectionResult } from "./carrierDetection";
import { getAdapter as defaultGetAdapter, CarrierAdapter } from "./adapters";

export class UnknownCarrierError extends Error {
  constructor(containerNumber: string) {
    super(
      `Could not determine a carrier for container "${containerNumber}" — no explicit carrier on file and the owner prefix isn't recognized.`
    );
    this.name = "UnknownCarrierError";
  }
}

/**
 * Where the pipeline persists the cached tracking result. The UI/API layer
 * only ever reads through `store.get` — it never touches an adapter directly
 * (see requirement 6: refresh only on the scheduled job or a webhook).
 * Production wires a Mongo-backed store (`lib/tracking/sync.ts`); tests wire
 * a plain in-memory Map so the whole pipeline can be exercised without a DB.
 */
export interface TrackingStore {
  get(containerNumber: string): Promise<ContainerTracking | null>;
  set(containerNumber: string, tracking: ContainerTracking): Promise<void>;
}

export interface PipelineDeps {
  store: TrackingStore;
  detectCarrier?: (containerNumber: string, explicitCarrier?: CarrierCode | null) => CarrierDetectionResult;
  getAdapter?: (carrier: CarrierCode) => CarrierAdapter;
  /** Raw payloads kept per container for debugging (most recent first). Defaults to 5. */
  maxRawHistory?: number;
}

/** In-memory store — used by tests and available as a lightweight demo fallback. */
export class InMemoryTrackingStore implements TrackingStore {
  private data = new Map<string, ContainerTracking>();

  async get(containerNumber: string): Promise<ContainerTracking | null> {
    return this.data.get(containerNumber) ?? null;
  }

  async set(containerNumber: string, tracking: ContainerTracking): Promise<void> {
    this.data.set(containerNumber, tracking);
  }

  clear() {
    this.data.clear();
  }
}

/**
 * The full pipeline: detect carrier -> fetch via that carrier's adapter ->
 * normalize (done inside the adapter) -> cache. This is the one function
 * both the production sync job/webhook receiver and the test suite call —
 * so the exact same code path is what's verified end-to-end before any real
 * credentials exist.
 */
export async function syncContainerTracking(
  containerNumber: string,
  explicitCarrier: CarrierCode | null | undefined,
  deps: PipelineDeps
): Promise<ContainerTracking> {
  const detectCarrier = deps.detectCarrier ?? defaultDetectCarrier;
  const getAdapter = deps.getAdapter ?? defaultGetAdapter;
  const maxRawHistory = deps.maxRawHistory ?? 5;

  const detection = detectCarrier(containerNumber, explicitCarrier);
  if (!detection.carrier) {
    throw new UnknownCarrierError(containerNumber);
  }

  const adapter = getAdapter(detection.carrier);
  const result = await adapter.fetchTracking(containerNumber);
  const status = deriveStatus(result.tracking.events);

  const existing = await deps.store.get(containerNumber);
  const now = new Date().toISOString();

  const tracking: ContainerTracking = {
    ...result.tracking,
    carrierDetectionSource: detection.source,
    status,
    lastSyncedAt: now,
    raw: [{ carrier: detection.carrier, fetchedAt: now, payload: result.rawPayload }, ...(existing?.raw ?? [])].slice(
      0,
      maxRawHistory
    ),
  };

  await deps.store.set(containerNumber, tracking);
  return tracking;
}

/**
 * Applies a carrier's pushed webhook payload directly to the cache, without
 * calling the adapter's fetch path (the carrier already pushed the data).
 * Used by the webhook receiver stub — see `app/api/webhooks/tracking/[carrier]`.
 */
export async function applyWebhookPayload(
  carrier: CarrierCode,
  payload: unknown,
  deps: PipelineDeps
): Promise<ContainerTracking> {
  const getAdapter = deps.getAdapter ?? defaultGetAdapter;
  const maxRawHistory = deps.maxRawHistory ?? 5;

  const adapter = getAdapter(carrier);
  const result = adapter.parseWebhookPayload(payload);
  const status = deriveStatus(result.tracking.events);
  const containerNumber = result.tracking.containerNumber;

  const existing = await deps.store.get(containerNumber);
  const now = new Date().toISOString();

  const tracking: ContainerTracking = {
    ...result.tracking,
    carrierDetectionSource: existing?.carrierDetectionSource ?? "explicit",
    status,
    lastSyncedAt: now,
    raw: [{ carrier, fetchedAt: now, payload }, ...(existing?.raw ?? [])].slice(0, maxRawHistory),
  };

  await deps.store.set(containerNumber, tracking);
  return tracking;
}

/** What the UI/API reads — the cache only, never the adapter layer. */
export async function getCachedTracking(
  containerNumber: string,
  deps: Pick<PipelineDeps, "store">
): Promise<ContainerTracking | null> {
  return deps.store.get(containerNumber);
}
