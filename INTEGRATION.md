# Container Tracking — Going Live Per Carrier

The tracking system (`lib/tracking/`) runs entirely on mock fixture data by
default. Nothing about its structure changes when real credentials arrive —
each carrier is switched independently by filling in its env vars and
flipping its `USE_MOCK_DATA` flag. No code changes are required. Background
and context: `DOCs/container tracking.docx`.

## How the switch works

- `TRACKING_USE_MOCK_DATA` (global) — default `true`. Every carrier falls
  back to this unless it has its own override.
- `<CARRIER>_USE_MOCK_DATA` (per-carrier) — set to `false` to take that one
  carrier live while the others stay on mock data. Useful for testing one
  integration at a time.
- See `.env.example` for the full list of variables with their defaults.

Once a carrier's `USE_MOCK_DATA` is `false`, its adapter
(`lib/tracking/adapters/<carrier>.ts`) requires `<CARRIER>_API_BASE_URL` and
`<CARRIER>_API_KEY` to be set, or it throws `AdapterNotConfiguredError` with
a clear message instead of silently falling back to mock data.

**Important caveat:** the exact endpoint paths and auth header names used in
each adapter's live branch are representative, written from the API
descriptions in `DOCs/container tracking.docx` — not verified against a real
sandbox response, since no credentials exist yet. Confirm the exact request
shape against each carrier's live docs during onboarding and adjust the one
`fetch()` call in that adapter if needed (the normalization logic below it
is what actually matters and won't need to change unless the carrier's
field names differ from the fixture).

## Maersk

- Portal: developer.maersk.com — self-service registration, generate an API
  key, test in sandbox, then go live (no mandatory sales approval for
  Track & Trace).
- Env vars: `MAERSK_API_BASE_URL`, `MAERSK_API_KEY`, `MAERSK_API_SECRET`
  (if issued), `MAERSK_USE_MOCK_DATA=false`.
- Auth header used in the adapter: `Consumer-Key: <MAERSK_API_KEY>` — confirm
  against the Track & Trace Plus reference once registered.
- Data source: Track & Trace Plus / MEC Tracking, already DCSA Track & Trace
  v2.2-standardized — this is why `lib/tracking/adapters/maersk.ts`'s event
  code map (`BOOK`, `GTIN`, `LOAD`, `DEPA`, `ARRI`, `DISC`, `GTOT`, `DLVD`)
  is a near 1:1 copy of the real DCSA codes.
- Webhooks: supported. Point Maersk's webhook config at
  `/api/webhooks/tracking/maersk` and set `MAERSK_WEBHOOK_SECRET` to
  whatever shared-secret scheme Maersk's webhook docs specify (the receiver
  stub currently checks a simple `x-webhook-secret` header — replace this
  with Maersk's real signature scheme if it differs).

## CMA CGM

- Portal: api-portal.cma-cgm.com — two-tier access. The public tier has a
  reported 6–12 hour data lag and thinner event detail; as an existing
  partner, request escalation to the **partner tier** through the account/
  commercial contact rather than relying on public-tier self-registration.
- Env vars: `CMACGM_API_BASE_URL`, `CMACGM_API_KEY`, `CMACGM_API_SECRET` (if
  issued), `CMACGM_USE_MOCK_DATA=false`.
- Auth header used in the adapter: `Authorization: Bearer <CMACGM_API_KEY>` —
  confirm the partner-tier auth scheme with the account team once escalated.
- Data source: CMA CGM's own Track & Trace API — not DCSA-standardized, so
  `lib/tracking/adapters/cmacgm.ts`'s status-label map
  (`STATUS_TO_TYPE`) is CMA CGM-specific and will need re-verification once
  partner-tier docs are in hand (field names may differ from the public
  tier this mock approximates). EDI (UN/EDIFACT) is available as an
  alternative channel if the partner-tier API proves insufficient for any
  booking/BL workflow.
- Webhooks: not offered by CMA CGM per the current integration doc — this
  carrier stays on the scheduled polling job (`syncAllInTransit`), not the
  webhook receiver.

## MSC

- Portal: developerportal.msc.com — sandbox is self-service; production
  requires a formal integration request specifying the **"Basic"** package
  (Track & Trace + Schedules only, which covers our use case — no need for
  Booking/VGM/BL tiers), signing a Data Sharing Agreement, and completing
  UAT with MSC's technical team before go-live.
- Env vars: `MSC_API_BASE_URL`, `MSC_API_KEY`, `MSC_API_SECRET` (if issued),
  `MSC_USE_MOCK_DATA=false`.
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

Run `npm test` — the mock-adapter pipeline tests
(`lib/tracking/__tests__/`) cover carrier detection, each adapter's
normalization, the rate limiter, and the full detect → fetch → normalize →
cache → display flow. Before switching a carrier live, additionally
validate tracking specifically on the real lanes this system exists for:
Montreal → Douala, Abidjan, Dakar, Matadi, and Kinshasa — the Matadi/
Kinshasa river-port leg is the likeliest place for milestone data gaps
since it involves transshipment plus a river-port handoff.
