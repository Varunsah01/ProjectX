import { computeGstForLine, isInterStateSupply } from "./gst";

export interface RecalcLineItem {
  qty: number;
  rate: number;
  hsnSac: string;
  gstRatePercent: number;
}

export interface RecalcInput {
  items: RecalcLineItem[];
  supplierState: string;
  buyerState: string;
}

export interface RecalcLineResult {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  hsnSac: string;
  gstRatePercent: number;
}

export interface RecalcResult {
  items: RecalcLineResult[];
  subtotalAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  /** subtotalAmount + totalTaxAmount — goes into Invoice.amount. */
  totalAmount: number;
  isInterState: boolean;
  placeOfSupply: string;
}

/**
 * Recompute all tax fields for an invoice from scratch.
 *
 * Call this from create/update invoice actions and the recurring cron.
 * `totalAmount` should be stored as `Invoice.amount` so payment logic
 * (`amount - paidAmount`) continues to work.
 */
export function recalculateInvoice(input: RecalcInput): RecalcResult {
  const { items, supplierState, buyerState } = input;
  const interState = isInterStateSupply(supplierState, buyerState);

  let subtotalAmount = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const lineResults: RecalcLineResult[] = items.map((item) => {
    const taxableAmount = item.qty * item.rate;

    const gst = computeGstForLine({
      taxableAmount,
      gstRatePercent: item.gstRatePercent,
      supplierState,
      buyerState,
    });

    subtotalAmount += taxableAmount;
    totalCgst += gst.cgst;
    totalSgst += gst.sgst;
    totalIgst += gst.igst;

    return {
      taxableAmount,
      cgstAmount: gst.cgst,
      sgstAmount: gst.sgst,
      igstAmount: gst.igst,
      hsnSac: item.hsnSac,
      gstRatePercent: item.gstRatePercent,
    };
  });

  const totalTaxAmount = totalCgst + totalSgst + totalIgst;

  return {
    items: lineResults,
    subtotalAmount,
    cgstAmount: totalCgst,
    sgstAmount: totalSgst,
    igstAmount: totalIgst,
    totalTaxAmount,
    totalAmount: subtotalAmount + totalTaxAmount,
    isInterState: interState,
    placeOfSupply: buyerState,
  };
}
