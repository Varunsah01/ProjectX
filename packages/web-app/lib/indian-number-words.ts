const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return one ? `${TENS[ten]}-${ONES[one]}` : TENS[ten];
}

function threeDigitWords(n: number): string {
  if (n === 0) return "";
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  if (hundred === 0) return twoDigitWords(remainder);
  if (remainder === 0) return `${ONES[hundred]} Hundred`;
  return `${ONES[hundred]} Hundred ${twoDigitWords(remainder)}`;
}

/**
 * Convert a whole-rupee integer to Indian English words.
 *
 * Uses Indian number grouping: crores (10^7), lakhs (10^5), thousands (10^3).
 *
 * @example
 * numberToIndianWords(42500)    // "Rupees Forty-Two Thousand Five Hundred Only"
 * numberToIndianWords(150000)   // "Rupees One Lakh Fifty Thousand Only"
 * numberToIndianWords(10000000) // "Rupees One Crore Only"
 * numberToIndianWords(0)        // "Rupees Zero Only"
 */
export function numberToIndianWords(n: number): string {
  if (n < 0) return `Minus ${numberToIndianWords(-n)}`.replace("Rupees ", "Rupees Minus ").replace("Minus Rupees Minus ", "Rupees Minus ");
  if (n === 0) return "Rupees Zero Only";

  const integer = Math.round(Math.abs(n));
  const parts: string[] = [];

  const crore = Math.floor(integer / 10000000);
  const lakh = Math.floor((integer % 10000000) / 100000);
  const thousand = Math.floor((integer % 100000) / 1000);
  const remainder = integer % 1000;

  if (crore > 0) parts.push(`${twoDigitWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (remainder > 0) parts.push(threeDigitWords(remainder));

  return `Rupees ${parts.join(" ")} Only`;
}
