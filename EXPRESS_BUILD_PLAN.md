# Express Platform: Build Plan

Developer guide for building the shipping reseller platform (partners, customers, pricing engine, tracking API). DHL Express is the first carrier. FedEx, UPS and others must be addable later without reworking the core (see "Multi-carrier design").
The business plan and diagrams are in the published plan page. This file is the working order of the build.

## How to use this file

- Build one phase at a time, in order. Do not start a phase until the previous one's "Done when" checks pass.
- One phase = one branch (`express/phase-1-orgs`, and so on) and one or more small commits.
- Tick the boxes as you go. Add notes under "Decisions log" at the bottom.
- Read the Next.js guide in `node_modules/next/dist/docs/` before writing routes or pages (see `CLAUDE.md`). This Next.js version differs from older ones.
- `proxy.ts` skips every `/api` path. Every new API route must check its own authentication.

## Ground rules (apply to every phase)

1. **Money is integer cents.** Never store or compute with floats. CAD only.
2. **Tier 1 (DHL cost) never leaves the server** except to the admin serializer. Partner and customer responses are built by their own serializer in `lib/shipping/core/serializers.ts`.
3. **Every org-owned query is scoped by `orgId`** through one shared helper. No route writes that filter by hand.
4. **Foreign records return 404**, not 403.
5. **Pricing is a pure function** with no database or network calls, covered by Vitest.
6. **Ledger is append-only.** Corrections are new entries.
7. **Every user-facing string exists in English and French** (`lib/i18n/translations.ts`).
8. **Audit log** (`lib/audit.ts`) for: pricing changes, key create/revoke, manual payments, adjustments, partner status changes.
9. **Secrets in env vars only.** Add each new variable to `.env.example`.
10. **Run `npm run lint` and `npm test` before each commit.**

## Multi-carrier design (DHL first, FedEx and UPS later)

DHL is the first carrier, not the shape of the system. Everything outside `lib/shipping/carriers/dhl/` must be carrier-neutral, so adding FedEx or UPS means writing one new folder and registering it, with no change to pricing, ledger, portals or the partner API.

**The rule:** no code outside a carrier's own folder may import from it, mention its field names (`detailedPriceBreakdown`, `priceType`, ...) or branch on `carrier === "dhl"`. Core code talks only to the `CarrierAdapter` interface.

```ts
// lib/shipping/core/types.ts  (shape to refine in Phase 0/2)
export type CarrierId = "dhl" | "fedex" | "ups";          // grows over time

export interface RateOption {                             // normalized, carrier-neutral
  carrier: CarrierId;
  serviceCode: string;                                    // carrier's own code
  serviceName: string;                                    // "Express Worldwide"
  currency: "CAD";
  listBaseFreightCents?: number;                          // public price, if the carrier gives it
  costBaseFreightCents: number;                           // our cost (Tier 1), server-only
  surcharges: { code: string; label: string; cents: number }[];
  transitDays?: number;
  raw: unknown;                                           // kept server-side for audit
}

export interface CarrierAdapter {
  id: CarrierId;
  capabilities: { listPrice: boolean; addressValidation: boolean; paperlessCustoms: boolean;
                  invoiceFeed: boolean; webhooks: boolean };
  getRates(req: RateRequest): Promise<RateOption[]>;
  validateAddress?(addr: Address): Promise<AddressCheck>;
  createShipment(req: BookRequest): Promise<BookedShipment>;  // awb, label PDF bytes, carrier ref
  cancelShipment?(ref: string): Promise<void>;
  track(awb: string): Promise<TrackingEvent[]>;
  parseInvoice?(file: Buffer): Promise<InvoiceLine[]>;        // for reconciliation
}
```

What this means for the build:

1. **Registry.** `lib/shipping/core/registry.ts` maps `CarrierId` to an adapter. Carriers are enabled per environment (env vars) and per organization (a partner may be allowed DHL only).
2. **Carrier-neutral pricing.** `pricing.ts` takes a `RateOption` and the org/customer rules and returns three tiers. It never knows which carrier it priced. The rule can be set per carrier (for example 15% off DHL, 10% off UPS), so rules are keyed by `(orgId, carrier)` with a default.
3. **Data carries the carrier.** `RateQuote`, `Shipment` and `DhlInvoiceImport` become `RateQuote`, `ExpressShipment` and `CarrierInvoiceImport`, each with a `carrier` and `serviceCode` field. Carrier-specific extras go in a `carrierData` sub-object, never as top-level fields.
4. **Capabilities, not assumptions.** If a carrier cannot return a public price, `listBaseFreightCents` is empty and the rule falls back to cost-plus (or a maintained list-price table). If it has no address validation, the step is skipped. UI and core code check `capabilities`, not the carrier name.
5. **Rate shopping later.** Because `getRates` returns a list of normalized options, comparing carriers is a loop over the registry plus a sort. Build the UI for one carrier now but render a list of options, so it needs no redesign.
6. **Neutral tracking and invoices.** Tracking events and invoice lines are normalized into one shape. The existing `lib/tracking/adapters/` pattern is the model to follow. Each carrier adds a tracking adapter there, and the partner API returns the same JSON for every carrier.
7. **Customs data stays in our shape.** The booking form collects customs items once in a neutral format. Each adapter translates it into its carrier's payload (DHL Paperless Trade, UPS Paperless, FedEx ETD).
8. **Credentials per carrier**, under a prefix (`DHL_*`, `FEDEX_*`, `UPS_*`), loaded only inside that carrier's folder.
9. **Contract tests.** One shared test suite runs against every adapter using saved fixtures: `getRates` returns valid `RateOption`s, `createShipment` returns an AWB and a label, no output contains secrets. A new carrier is done when it passes this suite.
10. **Partner API.** `/api/v1` accepts an optional `carrier` and `service`, and always returns the neutral shape. Partners never see which wholesale account was used.

## Target file layout

```
lib/shipping/
  core/
    types.ts           CarrierAdapter, RateOption, Address, BookRequest, TrackingEvent ...
    registry.ts        CarrierId -> adapter, per-env and per-org enablement
    pricing.ts         pure pricing function (carrier-neutral)
    ledger.ts          entries, balance, credit-limit check
    serializers.ts     admin / partner / customer output shapes
    reconcile.ts       matching by AWB (uses adapter.parseInvoice)
    orgScope.ts        orgId filter helper
    apiAuth.ts         API-key check for /api/v1
    __contract__/      shared adapter contract tests
  carriers/
    dhl/
      client.ts        auth, timeouts, retries, sandbox/prod switch
      rates.ts         /rates call, maps to RateOption (base freight vs surcharges)
      address.ts       /address-validate, remote-area flag
      shipments.ts     booking, label fetch, Paperless Trade payload
      tracking.ts      tracking mapping
      invoice.ts       DHL invoice parsing
      index.ts         exports the CarrierAdapter
      __fixtures__/    saved real responses
    fedex/             (future, same shape)
    ups/               (future, same shape)
models/
  Organization.ts  OrgCustomer.ts  ApiKey.ts  PricingRule.ts  RateQuote.ts
  ExpressShipment.ts  LedgerEntry.ts  CarrierInvoiceImport.ts
app/partner/*         partner portal
app/admin/express/*   admin modules
app/api/express/*     session-authenticated routes (portals)
app/api/v1/*          API-key routes (partners' systems)
```

---

## Phase 0: Confirm and unblock (3-5 days)

Goal: remove unknowns before writing product code.

- [ ] Request MyDHL API sandbox credentials. Link the Transimex shipper account number.
- [ ] Add `DHL_API_BASE_URL`, `DHL_API_KEY`, `DHL_API_SECRET`, `DHL_ACCOUNT_NUMBER` to `.env.local` and `.env.example`.
- [ ] Call `/rates` for CA to CM (Douala) and CA to CI (Abidjan). Save raw responses in `lib/shipping/carriers/dhl/__fixtures__/`.
- [ ] Confirm from the real response: where public list price and account price appear, field names, how surcharges are listed, currency.
- [ ] Call `/address-validate` for a normal and a remote destination. Note how remote area shows up.
- [ ] Ask DHL: does our account get an invoice data feed or EDI? Which destination countries are not serviced?
- [ ] Confirm the MongoDB deployment is a replica set (transactions are required for the ledger).
- [ ] Settle open decisions: customer logins (yes/no/per customer), API scope for launch (tracking only, or rates and booking too).

Done when: fixtures are saved, we know whether DHL returns the public price (if not, plan a `listPrices` table in Phase 2), and the replica-set question is answered.

## Phase 1: Partners and permissions (1-1.5 weeks)

Goal: partners exist, are isolated, and can log in.

- [ ] Models: `Organization`, `OrgCustomer`, `ApiKey`, `PricingRule` (keyed by org and carrier, with a default). Add an `allowedCarriers` list on `Organization`.
- [ ] `User`: add `orgId` and `orgRole` (`partner_admin`, `partner_staff`, `org_customer`). Check `models/User.ts` and the JWT payload in `lib/auth.ts`, so the token carries `orgId` and `orgRole`.
- [ ] `proxy.ts`: add `/partner` route rules, redirect each role to its own area.
- [ ] `lib/rbac.ts`: add `partners` and `express` permission modules.
- [ ] `lib/shipping/core/orgScope.ts`: one helper that returns the `orgId` filter from the session.
- [ ] `lib/shipping/core/apiAuth.ts`: read `x-api-key`, hash with SHA-256, look up, check revoked, return org and scopes. Reuse the existing rate limiter pattern from `lib/tracking/rateLimiter.ts`.
- [ ] Admin: `/admin/express/partners` (list, create, suspend, set default discount, credit limit). Invite email for the partner admin.
- [ ] Partner: `/partner` empty shell with navigation, EN/FR.
- [ ] Partner developers page: create key (shown once), list, revoke.
- [ ] Audit log events for all of the above.
- [ ] Tests: partner A cannot read partner B's customers, keys or shipments (404).

Done when: two test partners exist, each sees only its own portal, a key works and can be revoked.

## Phase 2: Carrier layer, DHL adapter and pricing (2-3 weeks)

Goal: staff can quote a real sandbox shipment and see all three price levels.

Build order inside the phase:

0. [ ] `core/types.ts` and `core/registry.ts`: the `CarrierAdapter` interface, `RateOption` and the registry (shapes in "Multi-carrier design"). Write these before any DHL code.
1. [ ] `core/pricing.ts` next, with tests. Inputs: a normalized `RateOption` (base freight, surcharges), org rule for that carrier, customer markup. Outputs: Tier 1, 2, 3 totals and line detail. Rules: discount and markup apply to base freight only, surcharges pass through, markup cannot be negative, optional `minProfitCents` (off by default).
2. [ ] Tests from the worked example: list base $100, cost $25, 15% off, $10 markup, surcharges $18 gives Tier 1 $43, Tier 2 $103, Tier 3 $113.
3. [ ] `carriers/dhl/client.ts`: timeouts, retry on 5xx and 429 only, error type that never includes credentials.
4. [ ] `carriers/dhl/rates.ts`: map the DHL response (use the Phase 0 fixtures) to `RateOption[]`. Reject non-CAD responses with a clear error. Set `capabilities` honestly (for example `listPrice` depends on the Phase 0 result).
5. [ ] `carriers/dhl/address.ts`: return a remote-area flag. Core requires a passed address check only when the adapter reports `addressValidation: true`.
6. [ ] `RateQuote` model with a TTL index on unbooked, expired quotes.
7. [ ] Short in-memory cache for identical rate requests (a few minutes).
8. [ ] Admin pages: `/admin/express/simulator` (enter shipment, see the carrier's options and 3 tiers for each) and `/admin/express/pricing` (rule editing, versioned).
9. [ ] `core/serializers.ts`: admin, partner, customer shapes. Add tests that partner and customer output has no Tier 1 or profit fields.
10. [ ] Shared contract test suite in `core/__contract__/` that any adapter must pass. Run it against the DHL fixtures.
11. [ ] Check: `grep` outside `carriers/dhl/` finds no DHL field names and no `=== "dhl"` branches.

Done when: three prices from the simulator match a hand calculation for at least three routes, and the serializer tests pass.

## Phase 3: Booking, labels and customs (2-3 weeks)

Goal: a sandbox shipment is booked end to end.

- [ ] `ExpressShipment` and `LedgerEntry` models. `ExpressShipment` has `carrier`, `serviceCode` and a `carrierData` object for carrier-specific extras. Unique index on `idempotencyKey`.
- [ ] `ledger.ts`: `reserve`, `commit`, `release`, `adjust`, `balance`, `checkCredit`. All writes in MongoDB transactions.
- [ ] Booking form (shared component for admin, partner and customer): addresses, parcels, contents.
- [ ] Customs fields required per item: description, HS code, quantity, unit value, origin country, reason for export. Block submit if missing.
- [ ] Incoterm: DAP, with duties and taxes billed to the receiver. Verify the exact DHL request fields in the sandbox. The form stores it in a neutral format.
- [ ] `carriers/dhl/shipments.ts`: translate the neutral `BookRequest` and customs items into the `/shipments` payload with Paperless Trade data, the Transimex account as payer, label as PDF with no price data.
- [ ] Confirm flow: check quote is unexpired, check credit, reserve, call the adapter's `createShipment`, then commit and store the label, or release on failure.
- [ ] Timeout handling: set the shipment to `unknown` and run a lookup job before any retry or refund.
- [ ] Store the label in R2 at `express/{orgId}/{shipmentId}/label.pdf` using `lib/r2.ts`. Download goes through a signed URL after an org check.
- [ ] Notification and email when a shipment is booked (`lib/email.ts`, `lib/notifications.ts`).
- [ ] Tests: double confirm with the same key books once; failed carrier call leaves balance unchanged.

Done when: a sandbox shipment is booked, the label opens from R2, the balance moves exactly once, and the printed label shows no prices.

## Phase 4: Partner portal (2-3 weeks)

Goal: a partner can run its business without staff help.

- [ ] Customers: list, add, edit, per-customer markup (flat or percent), optional login invitation.
- [ ] Booking for a customer from the partner portal.
- [ ] Shipments: list, detail, label download, tracking, own profit shown.
- [ ] Pricing page: default markup and per-customer overrides, with a live preview using the simulator logic.
- [ ] Balance page: current balance, credit limit, statement from the ledger.
- [ ] Admin side: record a manual payment against a partner (creates a ledger entry), reuse `Invoice` and `BankAccount` for monthly invoices.
- [ ] Funding mode field exists on `Organization`. Only `invoiced` is active until the team decides.
- [ ] Booking refused when it would pass the credit limit, with a clear message.

Done when: a test partner onboards a test customer, sets a $10 markup, books a shipment and sees the correct profit and balance.

## Phase 5: Customer portal and partner API (1.5-2 weeks)

Goal: partners' customers can book in `/dashboard`, and partners' websites can track.

- [ ] Customer pages under `/dashboard`: Express quote and booking, shipment list, detail, label. Shows the customer price only.
- [ ] DHL tracking adapter in `lib/tracking/adapters/` (calling `carriers/dhl/tracking.ts`) wired into the existing pipeline so the public tracking page finds express shipments. The partner API returns one neutral tracking shape for every carrier.
- [ ] `GET /api/v1/tracking/{awb}` and `GET /api/v1/shipments`, scoped to the key's org.
- [ ] Per-key rate limits. If production runs more than one instance, move the limiter to a shared store first.
- [ ] Optional in this phase or later: `POST /api/v1/rates`, `POST /api/v1/shipments`, webhooks to partner URLs.
- [ ] One-page API guide, in the style of `PUBLIC_TRACKING_DOCUMENTATION.md`.

Done when: a partner pastes a tracking call into a test page and sees live status for its own shipments only, and a foreign AWB returns 404.

## Phase 6: Invoice matching and weight corrections (about 2 weeks)

Goal: the carrier's bill is matched to our shipments and extra weight reaches the right balance.

- [ ] `CarrierInvoiceImport` model (with a `carrier` field). Parsing lives in each adapter's `parseInvoice`, matching and adjustments live in `core/reconcile.ts`.
- [ ] `/admin/express/reconciliation`: CSV upload first. Automated pull only if Phase 0 shows the carrier offers one.
- [ ] Match by AWB. Compare billed weight and cost with the quote.
- [ ] Re-price with the original rule versions and the billed weight. Create ledger adjustments for the partner (and the customer where relevant).
- [ ] Exception list: unmatched lines, cost above quote, large weight difference. Staff resolve each with a note.
- [ ] Terms of service acceptance (date and version) required when a partner is created. Block adjustments for partners without it.
- [ ] Email partners when an adjustment is posted.

Done when: a sample carrier invoice produces matched lines, correct adjustments and a short exception list.

## Phase 7: Hardening and launch (1-2 weeks)

- [ ] Failure tests: carrier down, carrier slow, duplicate confirm, expired quote.
- [ ] Security pass: key handling, org isolation, label download path, serializer leak tests.
- [ ] Daily job comparing ledger totals to shipment totals, emailing staff on a mismatch.
- [ ] Production DHL credentials. Launch with two friendly partners and a low credit limit.
- [ ] Staff handbook and partner guide (EN/FR).
- [ ] Monitoring and alerts for carrier errors and failed bookings.

Done when: the two pilot partners have booked real shipments, balances reconcile, and no cost field appears in any partner or customer response.

---

## Adding a new carrier later (checklist)

- [ ] Create `lib/shipping/carriers/<carrier>/` with the same files as `dhl/`.
- [ ] Implement `CarrierAdapter` and set its `capabilities` honestly.
- [ ] Save sandbox fixtures and pass the shared contract suite.
- [ ] Add a tracking adapter under `lib/tracking/adapters/`.
- [ ] Register it in `core/registry.ts` and add its env vars to `.env.example`.
- [ ] Add the carrier to `Organization.allowedCarriers` for the partners that should get it, and set pricing rules per carrier.
- [ ] Translate customs items to the carrier's paperless-trade format.
- [ ] If core code needed any change beyond the registry, fix the interface instead of adding a carrier-specific branch.

## Working efficiently

- **Order within every phase:** model, pure logic with tests, API route, then UI. UI last means fewer rewrites.
- **Use fixtures.** Once Phase 0 saves real DHL responses, develop and test against them. Hit the sandbox only for contract checks.
- **Keep the pure functions pure** (`pricing.ts`, serializers). They are the parts where bugs cost money.
- **Reuse before writing:** `lib/r2.ts`, `lib/audit.ts`, `lib/email.ts`, `lib/notifications.ts`, the tracking pipeline and rate limiter, existing admin page patterns under `app/admin/*`.
- **Build the admin side first** in each phase, then partner, then customer. Staff can then verify each step.
- **Small commits**, one per task group, so a bad change is easy to revert.
- **Parallel work:** Phases 4 and 5 can overlap if a second person joins. Everything else is sequential.

## Decisions log

| Date | Decision | Notes |
|---|---|---|
| 2026-10-13 | CAD only | Block non-CAD DHL responses |
| 2026-10-13 | Discounts apply to base freight only | Surcharges pass through |
| 2026-10-13 | No margin floor at launch | Setting built, off by default |
| 2026-10-13 | Partner markup: flat or percent | Cannot be negative |
| 2026-10-13 | Duties and taxes paid by recipient | Verify DHL support per country |
| 2026-10-13 | Labels stored in Cloudflare R2 | |
| 2026-10-13 | Wallet funding mode | Pending with team. Build ledger payment-agnostic |
| 2026-10-13 | Partner API is private (partners only) | Tracking first |
| 2026-10-13 | Multi-carrier architecture from day one | DHL first. FedEx, UPS later as new adapters. Core code stays carrier-neutral |
