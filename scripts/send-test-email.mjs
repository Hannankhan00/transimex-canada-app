import fs from "fs";
import path from "path";

// Load .env.local
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    });
  }
}

loadEnvLocal();

// Usage: node scripts/send-test-email.mjs [recipient]
// Sends a test message through Resend using RESEND_API_KEY / EMAIL_FROM from
// .env.local, then checks Resend's delivery status for it.
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM || "Transimex Canada <no-reply@transimex-canada.com>";
const to = process.argv[2] || process.env.ADMIN_EMAIL;

async function main() {
  if (!apiKey) throw new Error("RESEND_API_KEY is not set in .env.local");
  if (!to) throw new Error("Pass a recipient: node scripts/send-test-email.mjs you@example.com");

  console.log(`
Sending Resend test email from ${from} to ${to}...`);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Transimex Canada — email delivery test",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
        <h2 style="color:#0B2545;margin:0 0 12px">Email delivery is working</h2>
        <p>This is a test message from the Transimex Canada portal, sent through Resend from <strong>transimex-canada.com</strong>.</p>
        <p>If this landed in Spam or Promotions, mark it "Not spam" and let the dev team know.</p>
        <p style="color:#64748b;font-size:12px">Sent ${new Date().toISOString()}</p>
      </div>`,
      text: `Email delivery is working. This is a test message from the Transimex Canada portal, sent through Resend from transimex-canada.com. Sent ${new Date().toISOString()}`,
      tags: [{ name: "category", value: "delivery-test" }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`);
  console.log("Accepted by Resend. Email ID:", data.id);

  // Resend's status moves queued -> sent -> delivered within a few seconds
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`https://api.resend.com/emails/${data.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const status = await statusRes.json();
    console.log(`  status: ${status.last_event}`);
    if (["delivered", "bounced", "complained", "failed"].includes(status.last_event)) break;
  }
}

main().catch((err) => {
  console.error("Delivery failed:", err.message || err);
  process.exit(1);
});
