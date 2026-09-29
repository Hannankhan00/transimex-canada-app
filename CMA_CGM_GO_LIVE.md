# CMA CGM Track & Trace: go-live checklist

The adapter (`lib/tracking/adapters/cmacgm.ts`) was rebuilt on 2026-09-29 to follow CMA CGM's OpenAPI spec for
`operation.trackandtrace.v1` (DCSA T&T 2.2.0, CMA version 1.2.9, from
https://api-portal.cma-cgm.com/products/visibility?summaryId=operation.trackandtrace.v1).
It has only been tested against the mock data and mocked `fetch`, not against the real API.

## Confirmed with the real API (2026-09-30)

- The host `https://apis.cma-cgm.net` and the public `keyId` API key work: HTTP 200, `api-version: 2.2.0`.
  Tested with booking `CAN1029559`.
- The real response ran through the adapter correctly: Montreal → Tanger Med → Bata → Douala, with the right
  vessel for each leg.
- **Rate limit on this key: only 20 requests per hour** (`x-ratelimit-limit-hour: 20`). The app's limiter
  defaults to 50,000/day and 5/s and has no per-hour window. Before turning on the scheduled sync, add a per-hour
  cap to `lib/tracking/rateLimiter.ts` or ask CMA CGM for a higher quota.
- The public connection sends the booking reference as a 64-character hash. The adapter now ignores it, so
  `bookingNumber` will be empty unless the private (OAuth) connection returns the real value.
- Before a container is assigned, a booking only returns planned vessel events (ARRI/DEPA), with no equipment events.

## Before switching it on

1. **Switch off mock mode.** `CMACGM_USE_MOCK_DATA` is empty, so it falls back to `TRACKING_USE_MOCK_DATA=true`.
   Set `CMACGM_USE_MOCK_DATA=false` to call the real API.
2. **Check the `Next-Page` header on a real response.** The first test returned a single page, so only the
   `current-page` header has been seen so far (a bare cursor). The spec's example looks like a bare cursor. The code
   handles both a bare cursor and a full URL, but confirm which one the API sends.
3. **Review the mapping choices below.** The spec doesn't say what counts as "booked" or "delivered", so I made
   these choices:
   - An empty container released to the shipper (empty `GTOT` on the export side) → **Booking**
   - Stripped (`STRP`), dropped off full (`DROP`) or returned empty (empty `GTIN` on the import side) → **Delivered**
   - The vessel arriving at the destination port (`ARRI`) → **Discharge**, used only when there is no
     `DISC` event there

## Env vars to fill in `.env.local`

| Var | Value |
|---|---|
| `CMACGM_USE_MOCK_DATA` | `false` |
| `CMACGM_API_BASE_URL` | API host (see step 1) |
| `CMACGM_API_KEY` | API key for the public connection, or the OAuth client id for the private one |
| `CMACGM_API_SECRET` | Leave empty for the public connection (sent as the `keyId` header). Set it to use OAuth2 (private connection) |
| `CMACGM_BEHALF_OF` | Only if calling as a third party for an end customer (their partner ID) |
| `CMACGM_TOKEN_URL`, `CMACGM_OAUTH_SCOPE` | Optional. Defaults come from the spec |

**Public vs private:** the private (OAuth) connection adds rail/ramp moves and inland planned dates. You only get
these for bookings where you're a named party (booking party, shipper, consignee, etc.).

## First live test

- Try one known CMA CGM container and compare the timeline with what cma-cgm.com shows.
- The raw response is saved in the container's `raw` history, which makes it easy to check the mapping against real data.
- Run `npx vitest run lib/tracking` after any mapping change.

More detail is in `INTEGRATION.md` → "CMA CGM".
