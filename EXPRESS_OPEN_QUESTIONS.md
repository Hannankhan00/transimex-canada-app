# Transimex Express: open questions

Things nobody has answered yet. Each one says what it is, why it matters, what the system does today, and who has to answer.
When one is answered, change its status to **Answered** and write the answer under it. Do not delete it.

Last updated: 2026-10-28

Status key: **Open** (needs a decision or fact), **Waiting on DHL API docs**, **On hold** (parked on purpose), **Answered**.

---

## 1. Waiting on the DHL API documentation or sandbox

**2026-10-21: SANDBOX ACCESS WORKS (credentials in .env.local, DHL_MODE=sandbox).** We ran DHL's 15-case test pack (`node scripts/dhl-test-pack.mjs`, output in `dhl-test-pack/`) and drove our real adapter against the sandbox. Confirmed: rates, DAP and DDP (service DD) bookings, documents, destinations with no postal code (the key must be sent, empty), tracking calls. Fixed in our code: the commercial invoice is now requested and stored (new download on the client and staff shipment pages); goods are booked Paperless Trade (WY) and fall back to "print the invoice" when DHL refuses WY on the lane; the shipment description now equals the first line item; the destination postal code is optional; pickup requests carry the declared value.
**Questions to send DHL (status: Open):**
- **Products K (Paris) and E (Sydney) in the test pack** are not offered in the sandbox at any ship time ("filtered out on delivery"). Cases 5 and 9 cannot pass. Ask them to enable the products or replace the cases.
- **Paperless (WY) CA to Brazil** (case 12) is refused: the service is not offered on that lane. Same for Nigeria, Egypt, Morocco, Tunisia, Algeria in our rates. Ask which lanes are meant to support it.
- **The waybill document** (`waybillDoc`) is never returned by the sandbox even when requested. They ask for it in the test pack.
- **Tracking** returns 404 for every new waybill. Ask which sandbox waybills carry test scan data.
- **Pickup** (booked with the shipment or on its own) fails with "202401: No billing address found". Ask whether account 973995169 needs a billing address on file, or which shipper address the sandbox accepts. Until this is answered, a booking with pickup requested fails at DHL and goes to staff as a failed label.
- **Account 973995169 vs the inbound test account 974044956**: both worked in the sandbox. Confirm 973995169 is the right account for live.


These depend on what the DHL API really returns. They cannot be decided by guessing.

**2026-10-16: what we could get.** The public DHL page only offers the Reference Data Guide (v3.3.4) and the reference data spreadsheet. I read the spreadsheet (product codes, service/surcharge codes, tracking event codes, units). The page does NOT offer the OpenAPI file or the developer guide, so the shape of the rate and shipment responses is still unconfirmed.
**2026-10-16 (later): the OpenAPI file (v3.3.4) arrived and is read.** It settles the request and response SHAPES (details in 1.1, 1.2, 1.5). It cannot tell us what DHL's servers return for YOUR account: amounts, whether discounts show per line, and which optional services are on by default. Those need one real call to DHL's test environment (`https://express.api.dhl.com/mydhlapi/test`) with your sandbox credentials. DHL also offers a mock server (`https://api-mock.dhl.com/mydhlapi`) with fixed test data.
**Fixed from the OpenAPI file:** rate and pickup requests sent the account in a field the schema does not allow (it would have been rejected); the required `x-version: 3.3.4` header was missing; export reasons now use DHL's allowed values (gift, sample, commercial sale, personal belongings, return, temporary); price lines with no amount are ignored.

### 1.1 What fuel and surcharge amounts does the rate API return?
- **Status:** Shape answered by the OpenAPI file; real amounts need a sandbox call
- **From the OpenAPI file:** each product has `detailedPriceBreakdown` with one line per charge. The first line is the product (base freight, no service code). Fuel is its own line, code **FF**, type SCH (a surcharge DHL adds by itself). Each line can carry a `priceBreakdown` with the discount: `priceType` DISCOUNT, `rate` (percent), `price` (amount) and `basePrice` (the amount before discount). The totals also list STDIS (total discount), STTXA (total tax) and SPRQT (net freight). So the API is designed to show BOTH the public fuel (basePrice) and the discounted one (price).
- **Still unknown:** whether your account's response actually includes those discount details, and whether the line `price` is before or after the discount. One sandbox call answers it.
- **What we saw:** DHL's first invoice (YULR003322211) shows the 75% contract discount applied to the base charge AND to the fuel surcharge. Base 179.47 minus 134.60 = 44.87. Fuel 65.06 minus 48.79 = 16.27.
- **Why it matters:** the price a client pays includes fuel. We need to know whether the API gives us the full public fuel (65.06), the discounted fuel (16.27), or both.
- **Today:** the rule is "the client discount applies to base freight only, and surcharges (fuel, remote area...) pass through at the amount DHL's API returns". If the API returns full public fuel, clients pay full fuel while our cost is the discounted fuel.
- **Decision needed after the API is known:** see 2.1.

### 1.2 Does the rate API return DHL's public list price, and the pickup fee?
- **Status:** Likely yes from the discount details (see 1.1); confirm in sandbox. The OpenAPI file also lets a rate call carry `payerCountryCode` to get DHL's published rates without an account, if your profile allows it. The `BILLC / PULCL / BASEC` entries are CURRENCIES (billing, country public-rate currency, base), not "account price versus public price". No pickup fee field exists in the rate response.
- **Today:** if only our account rate comes back, the public price is rebuilt as account base / (1 - contract discount). The invoice confirms the 75% maths (44.87 / 0.25 = 179.48, one cent off the real 179.47). The pickup fee is taken from DHL when DHL supplies it; the setting in Express Settings is only a fallback.

### 1.3 Are optional services added automatically? (GoGreen Plus)
- **Status:** Partly answered, rest waiting on DHL API docs
- **OpenAPI file:** "GOGREEN CLIMATE NEUTRAL" is code EE (optional extra, we must ask for it). "GO GREEN PLUS - CARBON REDUCED" is code **FE**, type SCH (a surcharge) and marked "customer agreement". That fits the 0.27 on your invoice: it is probably an account-level setting DHL applies on its own. Ask your DHL rep to switch it off or confirm it. Also on the invoice: "EMERGENCY SITUATION" (CR) appears in DHL's sample as an automatic surcharge too.
- **Found 2026-10-16:** GoGreen Plus - Carbon Reduced is a selectable DHL service (content code GGP, with several service codes: F0, F1, FD, FE, FP, FQ, FT). So it is something added to a shipment or turned on for an account, not a built-in part of the price.
- **Still open:** whether the rates and shipment calls add it by default for your account, or only when we ask for it. If it is an account default, ask DHL to switch it off, or decide to include it in quotes.
- **What we saw:** the invoice has a 0.27 "GoGreen Plus - carbon reduced" charge.
- **Why it matters:** if it is added automatically, every shipment gets an extra charge that was not in our quote.
- **Question for the docs:** is it opt-in per shipment, an account setting, or always on? Can we turn it off or include it in the quote?

### 1.4 Which weight units does the API accept and return?
- **Status:** Mostly answered
- **Found 2026-10-16:** DHL's reference data lists both kilograms (KG) and pounds (LB/LBS), and the API takes a metric or imperial setting per request. Our code already sends metric, so clients keep using kg and no conversion is needed when booking.
- **Still needed:** pounds to kilograms conversion only when reading the weekly invoice, which shows weight in lb (1 lb = 0.4536 kg).
- **What we saw:** the invoice has a "Weight in Lb" column. Our app works in kilograms.
- **Your answer so far:** there should be a choice, or we use whatever DHL's API accepts.
- **Plan:** the app keeps kg for clients and converts if DHL needs pounds. Needed mainly for weight corrections.

### 1.5 Product codes and the other items marked VERIFY in the DHL code
- **Status:** Partly answered, rest waiting on DHL API docs / sandbox
- **Confirmed 2026-10-16 from the reference data:** parcel product is **P** (Express Worldwide, non-document); document product is **D** (Express Worldwide, document); "duties and taxes paid by sender" is service code **DD**; our shipper reference type **CU** (consignor reference number) is valid; surcharge codes: fuel **FF**, remote area delivery **OO/OC/OF**, remote area pickup **OB**, extended service area **OE**, address correction **MA**, oversize piece **YB**, overweight piece **YY**, non-stackable **YC**; duties and taxes lines use codes starting with X.
- **Fixed 2026-10-16:** the tracking event mapping was wrong for "PL" (processed at location). It was read as "awaiting pickup" but it is a normal hub scan, which would have shown the wrong status mid-delivery. The mapping now follows DHL's full list, delivered-damaged counts as delivered, and internal scans DHL marks as not visible are hidden from the timeline.
- **Answered by the OpenAPI file:** base freight = first breakdown line; fuel = line FF; customs fields and allowed values confirmed; documents need no export declaration (`isCustomsDeclarable: false`); the shipment response can also return DHL's charges (`getRateEstimates: true`), which would let us record what DHL will really bill per parcel; tracking can return GMT offsets per event (`requestGMTOffsetPerEvent`), so event times could be exact. Canada's default unit in DHL's data is lb/in, but metric is accepted.
- **Still open (needs a sandbox call):** the not-serviced response (the schema shows 400 and 404 errors with a text detail, not a code); whether total price includes tax (the total adds `STTXA`, our check assumes zero tax and would reject a response with tax); the real numbers for your account.
- **List:** which line of the price breakdown is the base freight, surcharge codes for Africa, customs fields, the code for "duties paid by sender", tracking event codes and their meaning, the response when a destination is not served, how a reference is returned.
- **Where:** every `VERIFY` comment in `lib/shipping/carriers/dhl/live.ts`.

### 1.6 Can documents be shipped through Express? (product "doc" versus parcel)
- **Status:** **BUILT 2026-10-16** (documents or goods choice at the start of a booking; documents skip customs items, use DHL product D, need a description and a "documents only" confirmation, and are capped by a weight limit set in Express Settings). Still open, needs DHL or your DHL rep:
  - **The real weight limit for product D.** The app uses 2 kg as a placeholder (Express Settings, "Document weight limit"). The reference data gives no usable figure.
  - **Which African destinations need customs paperwork even for documents.** If DHL offers no document product on a route, the form says so and sends the client to Goods.
  - **A wrongly declared shipment.** There is no "reclassify" button: the price and DHL product differ, so the fix is to cancel it (refund) and ask the client to rebook as goods. Say if you want a different process.
  - **Terms wording:** the confirmation tells the client they bear DHL's reclassification, extra charges and customs holds. Have the terms reviewed (see 2.4).
- **Found 2026-10-16:** document product is **D** (Express Worldwide, doc), parcel product is **P** (non-doc). There is also an "Express Envelope" product (X, documents up to 0.31 kg). For non-document shipments the API requires the customs "export declaration"; for documents it is not required.
- **Details still to settle:** the DHL product code for documents and its weight limit (the invoice's service is "EXPRESS WORLDWIDE doc"); whether a document shipment to Africa needs any customs paperwork or a declared value; whether documents are priced from the same rate call; whether the client picks "documents or goods" at the start of the booking (my suggestion).
- **Plain version:** DHL sells two kinds of shipment: **documents** (paperwork and letters with no commercial value) and **parcels** (goods). They have different product codes and different prices. The invoice you sent was a document shipment ("EXPRESS WORLDWIDE doc").
- **Today:** the Express booking form is built for parcels. The client must list customs items with values and tariff codes, and the DHL product used is the parcel one.
- **Question:** will clients ever send documents through Transimex Express? If yes, the form needs a "documents" option with no customs items. If no, nothing changes.

### 1.7 Does the API give us invoice data?
- **Status:** Mostly answered
- **Found 2026-10-16:** the MyDHL API has an "Invoice" API, but it is for uploading COMMERCIAL (customs) invoices with a shipment. It is not DHL's billing invoice. No billing API appears in the public documentation.
- **So:** the weekly DHL bill comes as the PDF (and maybe a CSV or Excel download from the MyBill website, see 3.2). Phase 8 will read the file, not call an API.

---

## 2. Business decisions (yours)

### 2.1 What fuel amount does a client pay?
- **Status:** Open (decide after 1.1)
- **Plain version:** DHL gives Transimex a discount on the fuel charge too. A client pays whatever we decide. Example with a client who has a 20% discount, on the invoice's shipment:
  - If fuel passes through at the full public amount: the client pays about 209 (15% off the DHL public total of about 245).
  - If fuel is also discounted: the client pays about 160 (35% off).
  - Our cost is 61.41 either way.
- **Question:** should the client's discount also apply to fuel, partly or fully, or should fuel always pass through at one fixed amount?

### 2.2 When a partner's customer books for themselves, who pays Transimex?
- **Status:** **Direction chosen 2026-10-28: Stripe Connect.** The partner connects their own Stripe account. When their customer pays by card, the partner's cut goes to the partner and Transimex's cut comes to Transimex. **Decided 2026-10-28:** Standard accounts (the partner connects their own Stripe account); the partner bears Stripe's card fee; a refund comes out of the partner's balance and gives back Transimex's share of the fee; partners on the weekly invoice keep that, Connect is only for customers paying by card. **Built:** partner "Connect Stripe" card on /express/partner, the charge on the partner's account with Transimex's share (the partner price) as the application fee, refunds, the optional STRIPE_CONNECT_WEBHOOK_SECRET, and the profit report (revenue = Transimex's share, no card fee). **Customer side built 2026-10-28:** once their partner can take charges, a customer gets the normal booking form (one final price, no breakdown), pays on Stripe, and sees only their own price on their bookings; the partner sees what their customers booked (read only) and it counts in their earnings. Until the partner connects Stripe the customer still sees only the price page. Untested against real Stripe: try it with test keys first.
- **Earlier options (kept for reference):**
- **Options:** the partner pays through their own billing mode, OR the customer pays by card and the partner's markup is paid out to them later.
- **Today:** customers with a login can see prices and shipments, but cannot book. Only the partner books.

### 2.3 Do updated terms force existing clients to accept again?
- **Status:** **Answered 2026-10-28:** email every client when the terms change. Anyone who has not accepted the new version must accept it while booking. Email sending is not built yet.
- **Today:** terms are versioned. Booking asks for the current version. Existing accounts are not asked to re-accept unless they book (the booking form shows the current terms and requires acceptance).

### 2.4 Is the Express terms wording final, and does it cover extra charges after shipping?
- **Status:** **Partly answered 2026-10-28.** The built-in wording now says Express ships to and from Canada (any country DHL serves, not only Africa) and has a Discounts section: discount only on shipments from or to Canada, none between two other countries. It already covers DHL billing extra after shipping (weight, size, duties, returns). Still a draft: it has not been checked against the DHL contract or by a lawyer. The version stored in the database (Admin > Terms) is separate: publish the new wording there.
- **Today:** version 1 is a draft. It has not been checked against the DHL contract. It should say that DHL can bill extra after a shipment (weight, size, surcharges, duties) and that we may pass it on.

### 2.5 May we use the DHL name? ("Powered by DHL")
- **Status:** Open (needs the DHL contract)
- **Today:** DHL is shown as text only, with no logo or colours.

### 2.6 Late DHL charges: how do we collect, and from whom? (Phase 8)
- **Status:** On hold until the DHL invoice format is clear
- **Parts:**
  - Weight or size corrections, extra surcharges, duties billed to us, return fees.
  - A client on weekly invoice: add the charge to their next invoice.
  - A client who paid by card (no saved card exists): send a payment link; block new bookings if unpaid after N days (suggested 14).
  - Charges below an amount (suggested $5) are absorbed.
  - A DHL error or a return is absorbed by default.
  - A weight correction priced like a normal quote.
  - Partners pay the adjustment themselves.

### 2.7 Should a person approve each late charge before the client is charged?
- **Status:** **Answered 2026-10-16: check first.** Every late charge goes to a staff review list before the client is charged. Automatic charging for small amounts can be added later if you want it.
- **Original question (kept for reference):**
- **Plain version:** when DHL's invoice shows more than we quoted, the system can either charge the client straight away, or put the charge in a list for a staff member to check first.
- **Why check first:** DHL's data can be wrong or can include things that are not the client's fault. A wrong charge to a client is worse than a delayed one.
- **Suggestion:** check first at the start, then allow automatic charging for small amounts later.

### 2.8 Can a client dispute a late charge, and do DHL credits go back to the client?
- **Status:** On hold
- **Suggestion:** a "dispute" button that pauses collection until staff answer. If DHL credits us for a shipment, the client gets the credit too.

### 2.9 Do you want to track that you paid DHL, and see quoted cost versus DHL's real cost?
- **Status:** **Answered 2026-10-28: yes, and calculate the profit.** The profit report (Admin > Express > Profit report) already uses the quoted DHL cost. **Built 2026-10-28:** enter DHL's real charge on a shipment by hand, record each DHL invoice and mark it paid (Admin > Express > DHL invoices), and import a DHL invoice CSV (waybill + amount columns, preview before saving). The profit report uses the real charge when it exists and shows quoted versus real. The CSV import is written without a sample of DHL's real file: send one (see 3.2) so the column detection can be checked.
- **Ideas:** mark each weekly DHL invoice paid, check its total equals the matched lines, show margin per week, export a CSV for your accountant.

### 2.10 Should client invoices stay on the quoted price, and the weekly invoice day match DHL's?
- **Status:** On hold
- **Today:** clients are billed the quoted price. DHL's real charges come later as separate adjustments. The weekly invoice day is whenever the scheduler runs the job.

### 2.11 Do we charge sales tax (GST/QST) to clients?
- **Status:** Open
- **What we saw:** DHL's invoice for an export shipment has no GST. Nothing in Express adds tax today. Domestic or imported cases are not covered.

---

## 3. Facts to confirm

### 3.1 Is the DHL account (973995169) used only for Transimex Express?
- **Status:** Open
- **Your answer so far:** you use DHL Express for everything in Transimex Express. Not yet clear whether the same DHL account also carries Transimex's other shipments.
- **Why it matters:** the sample invoice's only shipment was booked outside this app (shipper reference blank). If the account is shared, DHL invoices will contain lines that are not Express bookings, and the importer must set them aside. If it is Express only, every unmatched line is a problem to investigate.

### 3.2 What format will the weekly DHL invoice come in?
- **Status:** Open (you cannot confirm yet)
- **Known:** the PDF is text-based (the numbers can be read from it). A CSV or Excel download from the DHL MyBill website would be safer than reading a PDF.
- **To check:** whether MyBill lets you download the invoice detail as CSV or Excel.

### 3.3 What is the real contract discount to enter in Express Settings?
- **Status:** Open
- **What we saw:** 75% on the invoice. Only needed if the API returns just our account rate.
- **Also:** the invoice notes an average 4.9% DHL rate increase. Rates and discounts can change, so the setting must be kept current.

### 3.4 Credentials and switches still needed before launch
- **Status:** Open
- Stripe keys (test first), then live.
- DHL sandbox credentials, then live: key, secret and account number.
- A scheduler that calls the tracking job (every 15 to 30 minutes) and the invoice job (once a week), with `EXPRESS_CRON_SECRET`.
- `EXPRESS_EMAILS_ENABLED=true` when you want Express emails to go out.

---

## 4. Things built on an assumption (check they are right)

| # | Assumption | Where |
|---|---|---|
| 4.1 | A partner's markup is a percent of the price the partner pays. The pickup fee is excluded from Transimex's profit. | pricing |
| 4.2 | A quote below DHL's cost is refused. | quotes |
| 4.3 | The weekly invoice cycle is the schedule of the job. The job bills everything labelled and not yet billed. | invoices |
| 4.4 | Credit used = credit bookings not yet invoiced + unpaid invoices - credits waiting. Only accounts with the invoice option and an admin credit limit can use it. | credit |
| 4.5 | An overdue invoice blocks new credit bookings only; card booking still works. | credit |
| 4.6 | A paid booking still waiting for its label is not invoiced yet but counts against the credit limit. | invoices |
| 4.7 | Cancelling a credit booking credits the account (lower charge before invoicing, a credit note after). | cancel |
| 4.8 | Invoices are printable pages, not PDF files. | invoices |
| 4.9 | A partner gives their customer the login details themselves. There is no email with the password and no forced password change on first login. | partner |
| 4.10 | Client quotes below your cost, fuel and the pickup fee are handled by the rules above until 1.1 and 2.1 are decided. | pricing |
