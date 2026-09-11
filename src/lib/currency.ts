// Pure currency data + lookup. No React / react-native imports so it stays testable with plain node.

export type Currency = { code: string; label: string; symbol: string; flag: string };

export const DEFAULT_CURRENCY = 'USD';

/** Circulating ISO-4217 currencies, most-used first. Symbol falls back to the code where there is no common glyph. */
export const CURRENCIES: Currency[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', label: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  { code: 'SEK', label: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', label: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', label: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  { code: 'ISK', label: 'Icelandic Krona', symbol: 'kr', flag: '🇮🇸' },
  { code: 'PLN', label: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'CZK', label: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'HUF', label: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
  { code: 'RON', label: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴' },
  { code: 'BGN', label: 'Bulgarian Lev', symbol: 'лв', flag: '🇧🇬' },
  { code: 'TRY', label: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'RUB', label: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  { code: 'UAH', label: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦' },
  { code: 'ILS', label: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'GHS', label: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  { code: 'MAD', label: 'Moroccan Dirham', symbol: 'DH', flag: '🇲🇦' },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'MXN', label: 'Mexican Peso', symbol: 'MX$', flag: '🇲🇽' },
  { code: 'ARS', label: 'Argentine Peso', symbol: 'AR$', flag: '🇦🇷' },
  { code: 'CLP', label: 'Chilean Peso', symbol: 'CLP$', flag: '🇨🇱' },
  { code: 'COP', label: 'Colombian Peso', symbol: 'COL$', flag: '🇨🇴' },
  { code: 'PEN', label: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪' },
  { code: 'KRW', label: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'TWD', label: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'THB', label: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'VND', label: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'MYR', label: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'PHP', label: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'PKR', label: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  { code: 'BDT', label: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩' },
  { code: 'LKR', label: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰' },
  { code: 'NPR', label: 'Nepalese Rupee', symbol: 'रू', flag: '🇳🇵' },
  { code: 'QAR', label: 'Qatari Riyal', symbol: 'QR', flag: '🇶🇦' },
  { code: 'KWD', label: 'Kuwaiti Dinar', symbol: 'KD', flag: '🇰🇼' },
  { code: 'BHD', label: 'Bahraini Dinar', symbol: 'BD', flag: '🇧🇭' },
  { code: 'OMR', label: 'Omani Rial', symbol: 'OMR', flag: '🇴🇲' },
  { code: 'JOD', label: 'Jordanian Dinar', symbol: 'JD', flag: '🇯🇴' },
];

/** Unknown codes still render (old backups, hand-edited data) instead of blowing up. */
export const currencyOf = (code: string): Currency =>
  CURRENCIES.find((x) => x.code === code) ?? { code, label: code, symbol: code, flag: '🏳️' };

export const symbolOf = (code: string) => currencyOf(code).symbol;

/** Filter for the picker: matches code or label, case-insensitively. Empty query keeps the list order. */
export const searchCurrencies = (query: string): Currency[] => {
  const q = query.trim().toLowerCase();
  return q ? CURRENCIES.filter((x) => x.code.toLowerCase().includes(q) || x.label.toLowerCase().includes(q)) : CURRENCIES;
};
