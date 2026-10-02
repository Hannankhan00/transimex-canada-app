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

### Security & Privacy Safeguards
Unlike authenticated portal endpoints, the public endpoint (`/api/track`) is strictly sanitized:
- **No Client Identifiers**: Client names, phone numbers, and emails are never exposed.
- **No Commercial Data**: Billing rates (`rateCad`), duty charges, margins, and broker invoices are excluded.
- **No Internal Notes**: CBSA notes, internal dispatch details, and audit history are withheld.
- **Rate Limiting**: Built-in sliding-window IP rate limiter protects carrier API quotas from abuse and scraping.

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

### 3.1. Successful Transimex Shipment Response (`SHIPMENT`)

Returned when the reference matches an internal shipment record:

```json
{
  "success": true,
  "resultType": "SHIPMENT",
  "shipment": {
    "trackingNumber": "TMX-2026-00847",
    "quoteId": "QT-2026-00124",
    "status": "In Transit",
    "progress": 55,
    "transportMode": "Ocean Freight",
    "equipment": "40ft High Cube Container",
    "commodity": "Automotive Parts",
    "origin": {
      "city": "Montreal, QC",
      "detail": "Port of Montreal Terminal 4"
    },
    "destination": {
      "city": "Douala, Cameroon",
      "detail": "Douala Autonomous Port"
    },
    "eta": "2026-10-18T14:00:00.000Z",
    "customsStatus": "Released",
    "timeline": [
      {
        "title": "Booking Confirmed",
        "location": "Montreal, QC",
        "timestamp": "2026-10-01T08:30:00.000Z",
        "statusText": "Shipment booked and documentation accepted",
        "completed": true
      },
      {
        "title": "Gate In / Port Terminal",
        "location": "Montreal Port Terminal",
        "timestamp": "2026-10-03T11:15:00.000Z",
        "statusText": "Container gated in",
        "completed": true
      },
      {
        "title": "Loaded on Vessel",
        "location": "Port of Montreal",
        "timestamp": "2026-10-04T16:45:00.000Z",
        "statusText": "Vessel departed",
        "completed": true
      },
      {
        "title": "Port Discharge",
        "location": "Douala, Cameroon",
        "timestamp": "2026-10-18T14:00:00.000Z",
        "statusText": "Awaiting arrival",
        "completed": false
      }
    ],
    "vessel": {
      "vesselName": "CMA CGM DAKAR",
      "imoNumber": "9432158",
      "voyageNumber": "0ABC123",
      "legs": [
        {
          "role": "ORIGIN",
          "portName": "Port of Montreal",
          "unLocationCode": "CAMTR",
          "vesselName": "CMA CGM DAKAR"
        },
        {
          "role": "DESTINATION",
          "portName": "Douala",
          "unLocationCode": "CMDLA"
        }
      ],
      "status": "IN_TRANSIT"
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
            "location": {
              "unLocationCode": "CAMTR",
              "portName": "Montreal"
            }
          }
        ]
      }
    ],
    "lastUpdated": "2026-10-04T16:50:00.000Z"
  }
}
```

---

### 3.2. Direct Container Query Response (`CONTAINER`)

Returned when queried by container number directly (e.g. from carrier Track & Trace sync):

```json
{
  "success": true,
  "resultType": "CONTAINER",
  "container": {
    "containerNumber": "CMAU1234567",
    "containerSizeType": "42G1",
    "containerSizeLabel": "40ft Dry Standard",
    "vesselName": "CMA CGM DAKAR",
    "imoNumber": "9432158",
    "voyageNumber": "0ABC123",
    "originPort": {
      "unLocationCode": "CAMTR",
      "portName": "Montreal"
    },
    "destinationPort": {
      "unLocationCode": "CMDLA",
      "portName": "Douala"
    },
    "status": "IN_TRANSIT",
    "events": [
      {
        "eventType": "LOADED",
        "eventClassifierCode": "ACT",
        "eventDateTime": "2026-10-04T16:45:00Z",
        "location": {
          "unLocationCode": "CAMTR",
          "portName": "Montreal"
        }
      }
    ],
    "lastSyncedAt": "2026-10-04T17:00:00.000Z"
  }
}
```

---

### 3.3. Error Response (`404 Not Found`)

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
