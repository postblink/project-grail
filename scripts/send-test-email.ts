/**
 * Send a sample magic-link email using the branded template.
 *
 * Useful for verifying Resend setup end-to-end without going through the
 * login flow — confirms DKIM signing, domain reputation, and that the
 * template renders correctly in real email clients.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/send-test-email.ts <recipient>
 *
 * Reads RESEND_API_KEY and EMAIL_FROM from .env. Use a copy of .env.prod
 * (with the dotenv-friendly quoting) so the real production key is used.
 */
import "dotenv/config";
import { magicLinkHtml, magicLinkText } from "../src/lib/email-templates";

const to = process.argv[2];
if (!to || !to.includes("@")) {
  console.error("Usage: tsx scripts/send-test-email.ts <recipient-email>");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM;
if (!apiKey || !from) {
  console.error("RESEND_API_KEY and EMAIL_FROM must be set in .env");
  process.exit(1);
}

// A plausible-looking but inert callback URL. The recipient should NOT
// click this — it'll 404 — but the link should render and the email
// client's link preview should resolve to pd2grail.com.
const url = "https://pd2grail.com/api/auth/callback/resend?token=test-deliverability-check&email=" + encodeURIComponent(to);
const host = "pd2grail.com";

async function main() {
  console.log(`Sending test email`);
  console.log(`  from: ${from}`);
  console.log(`  to:   ${to}`);
  console.log("");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "[Test] Sign in to Project Grail",
      html: magicLinkHtml({ url, host }),
      text: magicLinkText({ url, host }),
    }),
  });

  const body = await res.text();
  console.log(`Status: ${res.status} ${res.statusText}`);
  console.log(`Body:   ${body}`);
  if (!res.ok) process.exit(1);
  console.log("");
  console.log("✓ Sent. Check the recipient inbox (including spam folder).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
