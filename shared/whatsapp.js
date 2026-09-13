export const WHATSAPP_PREFILLED_MESSAGE =
  "Hello PoliSmart Africa AI, I would like to learn more about your platform.";

export function buildWhatsAppChatUrl(rawNumber) {
  if (typeof rawNumber !== "string") {
    return null;
  }

  const normalizedNumber = rawNumber.trim();
  if (!/^\+?[1-9]\d{7,14}$/.test(normalizedNumber)) {
    return null;
  }

  const internationalNumber = normalizedNumber.replace(/^\+/, "");
  return `https://wa.me/${internationalNumber}?text=${encodeURIComponent(WHATSAPP_PREFILLED_MESSAGE)}`;
}
