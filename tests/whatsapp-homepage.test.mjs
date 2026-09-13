import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  WHATSAPP_PREFILLED_MESSAGE,
  buildWhatsAppChatUrl,
} from "../shared/whatsapp.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("WhatsApp chat URL requires a valid international number", () => {
  for (const invalidNumber of [undefined, null, "", "   ", "not-a-number", "+012345678", "+234 801 234 5678", "1234567", "+1234567890123456"]) {
    assert.equal(buildWhatsAppChatUrl(invalidNumber), null);
  }

  assert.equal(
    buildWhatsAppChatUrl(" +2348012345678 "),
    `https://wa.me/2348012345678?text=${encodeURIComponent(WHATSAPP_PREFILLED_MESSAGE)}`,
  );
  assert.equal(
    WHATSAPP_PREFILLED_MESSAGE,
    "Hello PoliSmart Africa AI, I would like to learn more about your platform.",
  );
});

test("homepage renders the accessible WhatsApp control only for valid configuration", () => {
  const homepage = fs.readFileSync(
    path.join(root, "src", "pages", "MarketingHomePage.tsx"),
    "utf8",
  );
  const styles = fs.readFileSync(path.join(root, "src", "styles.css"), "utf8");
  const environmentExample = fs.readFileSync(path.join(root, ".env.example"), "utf8");

  assert.match(homepage, /buildWhatsAppChatUrl\(import\.meta\.env\.VITE_WHATSAPP_NUMBER\)/);
  assert.match(homepage, /\{whatsappUrl \? \(/);
  assert.match(homepage, /href=\{whatsappUrl\}/);
  assert.match(homepage, /aria-label="Chat with PoliSmart Africa AI on WhatsApp \(opens in a new tab\)"/);
  assert.match(homepage, /target="_blank"/);
  assert.match(homepage, /rel="noopener noreferrer"/);
  assert.match(homepage, /<MessageCircle aria-hidden="true" \/>/);
  assert.match(styles, /\.whatsapp-chat-button:focus-visible/);
  assert.match(styles, /@media \(max-width: 520px\)/);
  assert.match(environmentExample, /^VITE_WHATSAPP_NUMBER=$/m);
  assert.doesNotMatch(homepage, /(?:\+?234|wa\.me\/)\d+/);
});
