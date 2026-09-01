import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

// Simple .env.local parser
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local file not found!");
    process.exit(1);
  }
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

loadEnvLocal();

const host = process.env.SMTP_HOST;
const port = parseInt(process.env.SMTP_PORT || "587", 10);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
const secure = process.env.SMTP_SECURE === "true" || port === 465;
const from = process.env.SMTP_FROM || `"Transimex Test" <${user}>`;

console.log("\n================ [SMTP CONFIGURATION CHECK] ================");
console.log(`Host:   ${host || "❌ NOT SET"}`);
console.log(`Port:   ${port} (Secure: ${secure})`);
console.log(`User:   ${user || "❌ NOT SET"}`);
console.log(`From:   ${from}`);
console.log(`Pass:   ${pass ? "******** (Loaded)" : "❌ NOT SET"}`);
console.log("============================================================\n");

if (!host || !user || !pass) {
  console.error("❌ Missing required SMTP environment variables in .env.local");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

console.log("⏳ Connecting to SMTP server and validating credentials...");

transporter.verify((error, success) => {
  if (error) {
    console.error("\n❌ SMTP Verification Failed!");
    console.error("Error Message:", error.message);
    if (error.code) console.error("Error Code:", error.code);
    if (error.response) console.error("Server Response:", error.response);
    process.exit(1);
  } else {
    console.log("\n✅ SUCCESS: SMTP connection established and credentials verified!");
    console.log("Server response:", success);
    process.exit(0);
  }
});
