# Public Shipment & Container Tracking Integration Guide

This document outlines the architecture, API endpoint specification, data shapes, and landing page frontend integration for Transimex's public multi-carrier tracking feature.

---

## 1. Overview & Architecture

The public tracking feature allows visitors to track shipments directly on the landing page without signing in. A single unified search box accepts any of the following identifiers:

- **Transimex Tracking ID**: (e.g., `TMX-2026-00847`)
- **Quote Reference**: (e.g., `QT-2026-00124`)
- **Ocean Container Number**: (e.g., `CMAU1234567`, `MAEU1234567`, `MSCU1234567`)
- **Carrier Booking / B/L Reference**: (e.g., `CAN1028600`, `CMDUCAN1028600`)
- **Future Vendor Tracking IDs**: Ready for integration with Maersk, MSC, and DHL tracking numbers.

### Data Source & Freshness
Lookups read the database first. If the cached carrier data was last synced more than **5 hours** ago, the endpoint calls the carrier live and saves the result; if that call fails, the cached data is returned. A reference that is not in the database at all gets a live carrier lookup, or a `404` if the carrier does not know it. The scheduled job (`/api/cron/sync-tracking`) and carrier webhooks also refresh the cache.

### Security & Privacy Safeguards
- **Two tiers.** Anonymous callers get a minimal view. Server-to-server callers send `x-api-key: $TRACKING_PUBLIC_API_KEY` and additionally get `equipment`, `commodity`, origin/destination `detail`, `portOfEntry` and a scrubbed `timeline`. No key configured means nobody is trusted.
- **Never returned to anyone**: client names/phones/emails, `quoteId` or quote references (quote numbers are not searchable), billing data, CBSA/internal notes, carrier name/SCAC.
- **Input validation**: references must match `[A-Z0-9-_ ]`, 3-35 chars (regex-escaped before querying).
- **Rate limiting** (in-memory, per instance): 30 req/min per IP anonymous, 600 req/min per API key. `429` includes a `Retry-After` header.
- **Known limitation**: `TMX-2026-NNNNN` IDs have a 5-digit random suffix, so they are guessable at ~90k values; the anonymous response is minimal for that reason.

---

## 2. API Endpoint Specification

### `GET /api/track`
Also accepts `POST /api/track` with JSON `{ "query": "YOUR_TRACKING_REF" }`.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `q` | `string` | Yes | Tracking ID, Container Number, or Vendor Booking Reference (also accepts `query`, `number`, `reference`, or `id`). |

#### Example Requests
```bash
# Tracking by Transimex Shipment ID
GET /api/track?q=TMX-2026-00847

# Tracking by Container Number (CMA CGM / Maersk / MSC)
GET /api/track?q=CMAU1234567

# Tracking by Vendor Booking Reference
GET /api/track?q=CAN1028600
```

---

## 3. Data Schema & Response Samples

Every successful response has these root fields: `success`, `resultType` (`SHIPMENT` | `CONTAINER` | `BOOKING_REFERENCE`), `matchedReference` (the normalized reference searched), `matchedOn` (`TRACKING_NUMBER` | `BOOKING_REFERENCE` | `CONTAINER_NUMBER` | `LINKED_RECORD` | `CONTAINER_CACHE` | `CARRIER_LOOKUP`) and `lastUpdated` (ISO time the data was last synced).

### Enums (exact casing)
| Field | Values |
| :--- | :--- |
| `shipment.status` (Title Case) | `Pending Dispatch`, `In Transit`, `Customs Hold`, `Out for Delivery`, `Delivered`, `Cancelled` |
| `shipment.customsStatus` | `Pending`, `In Review`, `Released`, `Held` |
| `vessel.status`, `containers[].status` | `PENDING`, `IN_TRANSIT`, `DELIVERED` |
| `events[].eventType` | `BOOKING`, `GATE_IN`, `LOADED`, `VESSEL_DEPARTURE`, `TRANSSHIPMENT`, `DISCHARGE`, `GATE_OUT`, `DELIVERED` |
| `events[].eventClassifierCode` | `PLN` (planned), `EST` (estimated), `ACT` (actual) |
| `vessel.legs[].role` | `ORIGIN`, `TRANSSHIPMENT`, `DESTINATION` |

### Field semantics
- **Authoritative status**: `shipment.status` is the admin-set status, but if it is still `Pending Dispatch` while the carrier reports movement it is returned as `In Transit`. `vessel.status` / `containers[].status` are derived from carrier events.
- **`eta`**: the vessel's arrival at the destination port when known, otherwise the shipment ETA only if it is a real ISO date; omitted otherwise.
- **`progress`**: 0-100. Admin status sets the floor; carrier voyage position raises it while the cargo is on the water (max 90 until delivered).
- **De-duplication**: `vessel.events` is omitted when containers carry the events; `containers[].portRotation` is omitted when `vessel.legs` exists.
- **Event `description`** is free English text; translate from `eventType` instead.
- Carrier/SCAC is intentionally not exposed (Transimex is the carrier of record).

### 3.1. Shipment Response (`SHIPMENT`), anonymous tier

```json
{
  "success": true,
  "resultType": "SHIPMENT",
  "matchedReference": "TMX-2026-00847",
  "matchedOn": "TRACKING_NUMBER",
  "lastUpdated": "2026-10-04T16:50:00.000Z",
  "shipment": {
    "trackingNumber": "TMX-2026-00847",
    "status": "In Transit",
    "progress": 55,
    "transportMode": "Ocean Freight",
    "origin": { "city": "Montreal, QC" },
    "destination": { "city": "Douala, Cameroon" },
    "eta": "2026-10-18T14:00:00.000Z",
    "customsStatus": "Released",
    "vessel": {
      "vesselName": "CMA CGM DAKAR",
      "imoNumber": "9432158",
      "voyageNumber": "0ABC123",
      "legs": [
        { "role": "ORIGIN", "portName": "Port of Montreal", "unLocationCode": "CAMTR", "vesselName": "CMA CGM DAKAR" },
        { "role": "DESTINATION", "portName": "Douala", "unLocationCode": "CMDLA" }
      ],
      "status": "IN_TRANSIT",
      "arrival": { "dateTime": "2026-10-18T14:00:00.000Z", "actual": false },
      "lastSyncedAt": "2026-10-04T16:50:00.000Z"
    },
    "containers": [
      {
        "containerNumber": "CMAU1234567",
        "containerSizeType": "42G1",
        "containerSizeLabel": "40ft Dry Standard",
        "status": "IN_TRANSIT",
        "events": [
          {
            "eventType": "GATE_IN",
            "eventClassifierCode": "ACT",
            "eventDateTime": "2026-10-03T11:15:00Z",
            "location": { "unLocationCode": "CAMTR", "portName": "Montreal" }
          }
        ]
      }
    ]
  }
}
```

With the API key, `shipment` additionally contains `equipment`, `commodity`, `origin.detail`, `destination.detail`, `portOfEntry` and `timeline[]` (`timestamp` is `null` when not a real date; quote references are removed from `statusText`).

---

### 3.2. Direct Container Query Response (`CONTAINER`)

```json
{
  "success": true,
  "resultType": "CONTAINER",
  "matchedReference": "CMAU1234567",
  "matchedOn": "CONTAINER_CACHE",
  "lastUpdated": "2026-10-04T17:00:00.000Z",
  "container": {
    "containerNumber": "CMAU1234567",
    "containerSizeType": "42G1",
    "containerSizeLabel": "40ft Dry Standard",
    "vesselName": "CMA CGM DAKAR",
    "imoNumber": "9432158",
    "voyageNumber": "0ABC123",
    "originPort": { "unLocationCode": "CAMTR", "portName": "Montreal" },
    "destinationPort": { "unLocationCode": "CMDLA", "portName": "Douala" },
    "portRotation": [],
    "status": "IN_TRANSIT",
    "events": [
      {
        "eventType": "LOADED",
        "eventClassifierCode": "ACT",
        "eventDateTime": "2026-10-04T16:45:00Z",
        "location": { "unLocationCode": "CAMTR", "portName": "Montreal" }
      }
    ],
    "lastSyncedAt": "2026-10-04T17:00:00.000Z"
  }
}
```

A `BOOKING_REFERENCE` response has `vessel` and `containers` at the root, alongside the same root fields.

---

### 3.3. Error Responses
| Status | When | Notes |
| :--- | :--- | :--- |
| `400` | Missing/invalid reference | `{ "error": "..." }` |
| `404` | Not found anywhere | body below |
| `429` | Rate limited | `Retry-After` header (seconds) and `retryAfterSeconds` in the body |
| `500` | Unexpected failure | generic message only; details are logged server-side |

`404` body:

```json
{
  "error": "No shipment, container, or carrier record found for \"XYZ99999\". Please verify your reference number and try again.",
  "suggestion": "Enter a Transimex tracking ID (e.g. TMX-2026-XXXX), container number (e.g. CMAU1234567), or vendor booking reference."
}
```

---

## 4. Frontend Component & Landing Page Integration

A production-ready React component is provided at:
`components/landing/PublicTrackingSection.tsx`

### How to Embed in your Landing Page:

```tsx
// app/page.tsx (or your landing page file)
import PublicTrackingSection from "@/components/landing/PublicTrackingSection";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-[#0B2545] text-white py-16 text-center">
        <h1 className="text-4xl font-extrabold">Seamless Global Logistics</h1>
        <p className="mt-3 text-slate-300">Fast, reliable air, ocean, and ground freight across Canada & Africa.</p>
      </section>

      {/* Public Tracking Section */}
      <PublicTrackingSection />

      {/* Other landing page sections (Services, About, Contact, etc.) */}
    </main>
  );
}
```

---

## 5. Adding Future Carriers (Maersk, MSC, DHL)

The lookup pipeline is designed to be easily extensible:

1. **Carrier Detection** (`lib/tracking/carrierDetection.ts`):
   - Add prefixes to `PREFIX_TO_CARRIER` (e.g., `MSCU`, `MEDU` for MSC; `MAEU`, `MAEI` for Maersk; or DHL tracking formats).
2. **Carrier Adapters** (`lib/tracking/adapters/`):
   - `cmacgm.ts`: Implemented (DCSA 2.2.0 API).
   - `maersk.ts`: Implemented (DCSA 2.2.0 Track & Trace API).
   - `msc.ts`: Ready for adapter completion.
   - `dhl.ts`: Can be added adhering to the `CarrierAdapter` interface.
3. **Endpoint Integration**:
   - `app/api/track/route.ts` already calls the modular `detectCarrier` and `getAdapter` functions, meaning any newly connected carrier adapter is automatically available to the public tracking box without rewriting API logic.
