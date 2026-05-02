import Decimal from "decimal.js";

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  return GSTIN_REGEX.test(gstin);
}

export function extractStateCodeFromGstin(gstin: string): string {
  return gstin.slice(0, 2);
}

export function isInterStateSupply(
  supplierState: string,
  buyerState: string,
): boolean {
  return supplierState !== buyerState;
}

/** 2-digit state/UT codes per GST law. */
export const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  // 96-97 reserved for foreign/other territory
  "97": "Other Territory",
};

export interface GstLineInput {
  /** Pre-tax line amount in paise (qty * rate). */
  taxableAmount: number;
  /** GST rate as a percentage, e.g. 18 for 18%. */
  gstRatePercent: number;
  /** 2-digit supplier state code, e.g. "29". */
  supplierState: string;
  /** 2-digit buyer state code, e.g. "27". */
  buyerState: string;
}

export interface GstLineResult {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

/**
 * Compute GST for a single line item.
 *
 * Inter-state (supplier !== buyer) -> IGST = full rate on taxable amount.
 * Intra-state (same state) -> CGST + SGST = rate/2 each.
 *
 * All amounts in paise; uses Decimal.js for intermediate math.
 */
export function computeGstForLine(input: GstLineInput): GstLineResult {
  const { taxableAmount, gstRatePercent, supplierState, buyerState } = input;

  if (gstRatePercent === 0 || taxableAmount === 0) {
    return { cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
  }

  const taxable = new Decimal(taxableAmount);
  const rate = new Decimal(gstRatePercent);
  const hundred = new Decimal(100);

  if (isInterStateSupply(supplierState, buyerState)) {
    const igst = taxable.mul(rate).div(hundred).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
    return { cgst: 0, sgst: 0, igst, totalTax: igst };
  }

  const halfRate = rate.div(2);
  const cgst = taxable.mul(halfRate).div(hundred).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  const sgst = taxable.mul(halfRate).div(hundred).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
  return { cgst, sgst, igst: 0, totalTax: cgst + sgst };
}
