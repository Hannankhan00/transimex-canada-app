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

import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/email.ts";

async function main() {
  const targetEmail = process.env.SMTP_USER;
  console.log(`\n📧 Sending test branded verification email to: ${targetEmail}...`);

  try {
    const res = await sendVerificationEmail({
      to: targetEmail,
      name: "Hannan Khan",
      companyName: "Laurentian Global Logistics Ltd.",
    });

    console.log("✅ Email successfully delivered! Message ID:", res.messageId);
    console.log("Check your inbox at:", targetEmail);
  } catch (err) {
    console.error("❌ Delivery failed:", err);
  }
}

main();
