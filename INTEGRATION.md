# Container Tracking — Going Live Per Carrier

The tracking system (`lib/tracking/`) always calls each carrier's live API —
there is no mock or sample-data mode. A carrier goes live as soon as its env
vars are filled in; no code changes are required. Background and context:
`DOCs/container tracking.docx`.

## How it works

Each adapter (`lib/tracking/adapters/<carrier>.ts`) requires
`<CARRIER>_API_BASE_URL` and `<CARRIER>_API_KEY` to be set, or it throws
`AdapterNotConfiguredError` with a clear message. See `.env.example` for the
full list of variables with their defaults.

**Important caveat:** the exact endpoint paths and auth header names used in
each adapter's live branch are representative, written from the API
descriptions in `DOCs/container tracking.docx` — not verified against a real
sandbox response, since no credentials exist yet. Confirm the exact request
shape against each carrier's live docs during onboarding and adjust the one
`fetch()` call in that adapter if needed (the normalization logic below it
is what actually matters and won't need to change unless the carrier's
field names differ from the fixture).

## Maersk

- Portal: developer.maersk.com (Track & Trace Plus / Ocean Track & Trace, DCSA Interface Standard v2.2).
- Env vars:
  - `MAERSK_API_BASE_URL` (default `https://api.maersk.com`, or pre-prod `https://api-stage.maersk.com`).
  - `MAERSK_API_KEY`: Consumer Key (Client ID) generated under your App in Maersk Developer Portal.
  - `MAERSK_API_SECRET`: Client Secret generated under your App.
  - Optional: `MAERSK_TOKEN_URL` (default `https://api.maersk.com/customer-identity/oauth/v2/access_token`).
- Auth flow:
  - **Public / Key-only connection**: Sends `Consumer-Key: <MAERSK_API_KEY>` header.
  - **Private / Track & Trace Plus connection**: OAuth 2.0 client credentials flow. Automatically requests a Bearer token via `POST https://api.maersk.com/customer-identity/oauth/v2/access_token` with body `grant_type=client_credentials&client_id=<KEY>&client_secret=<SECRET>` and header `Consumer-Key: <KEY>`. The token is cached and refreshed automatically before expiration.
- Endpoints:
  - Private events: `GET /track-and-trace-private/events?equipmentReference={containerNumber}&limit=100` (or `carrierBookingReference={ref}` / `transportDocumentReference={ref}`).
  - Public events fallback: `GET /track-and-trace/public-events`.
  - Cursor pagination: Follows `Next-Page` header up to 10 pages.
- Reference lookup:
  - `maerskAdapter.fetchByReference(ref)` queries by booking reference or bill of lading (B/L) and splits multi-container bookings into individual container tracks via `splitByContainer()`, identical to CMA CGM.
- Webhooks: supported. Point Maersk's webhook config at `/api/webhooks/tracking/maersk` and set `MAERSK_WEBHOOK_SECRET`.
- Gateway error notice (`ERR_GW_001`): If Maersk returns `401 {"code":"ERR_GW_001","message":"API Key Validation Failed, please check the API key","reason":"Invalid or expired Key"}`, ensure in your developer.maersk.com dashboard that the App is approved and has the "Track and Trace Plus" product linked with your Maersk Customer Code (approval is manual by Maersk for the Plus tier).

## CMA CGM

- Portal: api-portal.cma-cgm.com — two-tier access. The public tier has a
  reported 6–12 hour data lag and thinner event detail; as an existing
  partner, request escalation to the **partner tier** through the account/
  commercial contact rather than relying on public-tier self-registration.
- API: Track & Trace `operation.trackandtrace.v1` (DCSA T&T 2.2.0, CMA
  version 1.2.9). The adapter calls
  `GET {CMACGM_API_BASE_URL}/operation/trackandtrace/v1/events/{containerNumber}?limit=100`
  and follows the `Next-Page` header (cursor) for more pages. The response is
  a flat array of DCSA TRANSPORT (ARRI/DEPA) and EQUIPMENT
  (GTOT/GTIN/LOAD/DISC/STRP/DROP) events. CMA CGM doesn't send SHIPMENT events yet.
- Env vars: `CMACGM_API_BASE_URL` (API gateway, default
  `https://apis.cma-cgm.net`, **not** the api-portal host), `CMACGM_API_KEY`,
  `CMACGM_API_SECRET`. Optional:
  `CMACGM_BEHALF_OF` (partner ID, required only when calling as a third
  party), `CMACGM_TOKEN_URL`, `CMACGM_OAUTH_SCOPE`.
- Auth (both from the spec):
  - **Public** (key only): `keyId: <CMACGM_API_KEY>` header. Gives standard
    equipment moves, transshipment moves and planned vessel dates.
  - **Private** (set `CMACGM_API_SECRET`): OAuth2 client credentials against
    `https://auth.cma-cgm.com/as/token.oauth2` with scopes
    `tandtcommercial:read:be tandtpublic:read:be`. The token is cached until
    about a minute before it expires. Adds rail/ramp moves and inland planned
    dates for bookings where we are a named party.
- Mapping (`lib/tracking/adapters/cmacgm.ts`): each event is first placed on
  the journey using `carrierSpecificData.shipmentLocationType` (POL/PTS/POD/…).
  If that field is missing, it falls back to `transportationPhase` or matches
  against the first vessel LOAD (the POL) and the last vessel DISC (the POD).
  Mapping to our milestones: empty GTOT on the export side → BOOKING, full
  GTIN → GATE_IN, LOAD/DEPA at POL → LOADED/VESSEL_DEPARTURE, any move at a
  PTS → TRANSSHIPMENT (one arrival row and one departure row), ARRI/DISC at
  POD → DISCHARGE, full GTOT at POD → GATE_OUT, and STRP/DROP/empty return →
  DELIVERED. When there are several PLN/EST/ACT events for the same milestone,
  they collapse into one row. ACT is preferred, and the latest estimate is kept
  in `estimatedDateTime`.
- Webhooks: not offered by CMA CGM per the current integration doc — this
  carrier stays on the scheduled polling job (`syncAllInTransit`), not the
  webhook receiver.

## MSC

- Portal: developerportal.msc.com — sandbox is self-service; production
  requires a formal integration request specifying the **"Basic"** package
  (Track & Trace + Schedules only, which covers our use case — no need for
  Booking/VGM/BL tiers), signing a Data Sharing Agreement, and completing
  UAT with MSC's technical team before go-live.
- Env vars: `MSC_API_BASE_URL`, `MSC_API_KEY`, `MSC_API_SECRET` (if issued).
- Auth header used in the adapter: `x-api-key: <MSC_API_KEY>` — confirm
  against MSC's Basic-package reference during UAT.
- **Rate limit is fixed and not negotiable: 100,000 calls/day, 4 calls/
  second.** `lib/tracking/rateLimiter.ts` already enforces this
  (`MSC_RATE_LIMIT_PER_DAY` / `MSC_RATE_LIMIT_PER_SECOND` in `.env`, defaulting
  to MSC's stated caps) — do not raise these values past what MSC confirms.
- Webhooks: supported. Point MSC's webhook config at
  `/api/webhooks/tracking/msc` and set `MSC_WEBHOOK_SECRET`. As with Maersk,
  the receiver stub's shared-secret header check is a placeholder — replace
  it with MSC's real signature scheme once documented.

## Scheduled sync job

`GET /api/cron/sync-tracking` refreshes every tracked container that isn't
delivered yet (skips delivered ones) and respects each carrier's rate
limiter. Point a scheduler at it (Vercel Cron, an external cron service, or
a manual `curl` during a demo), sending
`Authorization: Bearer <TRACKING_CRON_SECRET>`. If `TRACKING_CRON_SECRET`
isn't set, the route stays open — set it before exposing this route
publicly.

## Testing before go-live

Run `npm test` — the tracking tests, which feed sample payloads through the real adapters
(`lib/tracking/__tests__/`) cover carrier detection, each adapter's
normalization, the rate limiter, and the full detect → fetch → normalize →
cache → display flow. Before switching a carrier live, additionally
validate tracking specifically on the real lanes this system exists for:
Montreal → Douala, Abidjan, Dakar, Matadi, and Kinshasa — the Matadi/
Kinshasa river-port leg is the likeliest place for milestone data gaps
since it involves transshipment plus a river-port handoff.
