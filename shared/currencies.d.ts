export const SUPPORTED_FUNDRAISING_CURRENCIES: readonly string[];
export function currencyForCountry(country: string): string;
export function isSupportedFundraisingCurrency(currency: string): boolean;
export function formatCurrencyAmount(currency: string, amount: string | number): string;
