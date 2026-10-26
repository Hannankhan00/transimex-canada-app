/**
 * Checks the Stripe settings in .env.local without charging or creating anything:
 *
 *   node scripts/stripe-check.mjs
 *
 * It reads PAYMENTS_MODE, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET and APP_URL, asks Stripe who the key belongs to
 * (a read-only call) and prints whether the key is test or live, whether the account can take card payments in CAD,
 * and the exact webhook URL and events to register in the Stripe dashboard.
 */
import fs from "node:fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const ok = (m) => console.log("  OK     " + m);
const bad = (m) => console.log("  FIX    " + m);
let problems = 0;
const check = (cond, good, fix) => (cond ? ok(good) : (problems++, bad(fix)));

console.log("Payment settings in .env.local");
const mode = (env.PAYMENTS_MODE || "off").toLowerCase();
check(mode === "stripe", "PAYMENTS_MODE=stripe", `PAYMENTS_MODE is "${mode}". Set PAYMENTS_MODE=stripe to use real Stripe Checkout.`);

const key = env.STRIPE_SECRET_KEY || "";
check(/^(sk|rk)_(test|live)_/.test(key), `STRIPE_SECRET_KEY looks right (${key.slice(0, 8)}...)`, "STRIPE_SECRET_KEY is missing or not a secret key (it starts with sk_test_ or sk_live_).");
const hook = env.STRIPE_WEBHOOK_SECRET || "";
check(hook.startsWith("whsec_"), "STRIPE_WEBHOOK_SECRET looks right", "STRIPE_WEBHOOK_SECRET is missing (it starts with whsec_; Stripe shows it after you add the webhook endpoint).");
const appUrl = (env.APP_URL || "").replace(/\/$/, "");
check(/^https?:\/\//.test(appUrl), `APP_URL=${appUrl}`, "APP_URL is missing. Stripe sends clients back to it after paying, for example http://localhost:3000.");

if (/^(sk|rk)_(test|live)_/.test(key)) {
  const res = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: "Bearer " + key } });
  const body = await res.json().catch(() => ({}));
  console.log("\nAsking Stripe about this key");
  if (!res.ok) {
    problems++;
    bad(`Stripe rejected the key: ${body?.error?.message || res.status}`);
  } else {
    ok(`Account: ${body.business_profile?.name || body.settings?.dashboard?.display_name || body.id} (${body.country}), ${key.includes("_live_") ? "LIVE mode: real money" : "TEST mode: no real money"}`);
    check(body.charges_enabled, "Card payments are enabled on the account", "Card payments are not enabled yet on this Stripe account. Finish the account setup in the Stripe dashboard.");
    check(body.default_currency === "cad" || body.country === "CA", `Account currency/country: ${body.default_currency}/${body.country}`, `The account's default currency is ${body.default_currency}. Express charges in CAD: check that CAD payments are supported.`);
  }
}

console.log("\nIn the Stripe dashboard (Developers > Webhooks > Add endpoint)");
console.log(`  Endpoint URL: ${appUrl || "<APP_URL>"}/api/webhooks/stripe`);
console.log("  Events to send: checkout.session.completed, checkout.session.expired");
console.log("  Then copy the signing secret (whsec_...) into STRIPE_WEBHOOK_SECRET.");
console.log("  Local testing: run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and use the whsec_ it prints.");
console.log("\n" + (problems ? `${problems} thing(s) to fix above.` : "All good."));
