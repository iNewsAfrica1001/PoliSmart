const COUNTRY_CURRENCIES = Object.freeze({
  algeria: "DZD", angola: "AOA", benin: "XOF", botswana: "BWP", "burkina faso": "XOF",
  burundi: "BIF", "cabo verde": "CVE", "cape verde": "CVE", cameroon: "XAF",
  "central african republic": "XAF", chad: "XAF", comoros: "KMF", "republic of the congo": "XAF",
  congo: "XAF", "democratic republic of the congo": "CDF", "dr congo": "CDF", djibouti: "DJF",
  egypt: "EGP", "equatorial guinea": "XAF", eritrea: "ERN", eswatini: "SZL", swaziland: "SZL",
  ethiopia: "ETB", gabon: "XAF", gambia: "GMD", ghana: "GHS", guinea: "GNF",
  "guinea bissau": "XOF", "cote d ivoire": "XOF", "ivory coast": "XOF", kenya: "KES",
  lesotho: "LSL", liberia: "LRD", libya: "LYD", madagascar: "MGA", malawi: "MWK", mali: "XOF",
  mauritania: "MRU", mauritius: "MUR", morocco: "MAD", mozambique: "MZN", namibia: "NAD",
  niger: "XOF", nigeria: "NGN", rwanda: "RWF", "sao tome and principe": "STN",
  "sao tome principe": "STN", senegal: "XOF", seychelles: "SCR", "sierra leone": "SLE",
  somalia: "SOS", "south africa": "ZAR", "south sudan": "SSP", sudan: "SDG", tanzania: "TZS",
  togo: "XOF", tunisia: "TND", uganda: "UGX", zambia: "ZMW", zimbabwe: "ZWG",
});

export const SUPPORTED_FUNDRAISING_CURRENCIES = Object.freeze([
  ...new Set([...Object.values(COUNTRY_CURRENCIES), "USD", "EUR", "GBP"]),
].sort());

function normalizeCountry(country) {
  return String(country || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z]+/g, " ")
    .trim()
    .toLowerCase();
}

export function currencyForCountry(country) {
  return COUNTRY_CURRENCIES[normalizeCountry(country)] || "";
}

export function isSupportedFundraisingCurrency(currency) {
  return SUPPORTED_FUNDRAISING_CURRENCIES.includes(String(currency || "").toUpperCase());
}

export function formatCurrencyAmount(currency, amount) {
  const numeric = Number(amount);
  const formatted = Number.isFinite(numeric)
    ? numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : "0";
  return `${String(currency || "").toUpperCase()} ${formatted}`.trim();
}
