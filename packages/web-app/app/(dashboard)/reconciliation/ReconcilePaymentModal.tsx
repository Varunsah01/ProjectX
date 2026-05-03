"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { reconcilePaymentAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";
import type { UnmatchedInvoice } from "@/lib/queries/reconciliation";

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "razorpay", label: "Razorpay" },
  { value: "upi", label: "UPI" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "online", label: "Online" },
];

const INPUT_CLS =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all";

interface Props {
  invoice: UnmatchedInvoice;
  isOpen: boolean;
  onClose: () => void;
}

export function ReconcilePaymentModal({ invoice, isOpen, onClose }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(invoice.balance);
  const [method, setMethod] = useState("bank_transfer");
  const [razorpayPaymentId, setRazorpayPaymentId] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setAmount(invoice.balance);
      setMethod("bank_transfer");
      setRazorpayPaymentId("");
      setNotes("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const isAmountValid = amount >= 1 && amount <= invoice.balance;

  function handleClose() {
    if (!isPending) onClose();
  }

  function handleSubmit() {
    if (!isAmountValid) return;
    startTransition(async () => {
      const result = await reconcilePaymentAction({
        invoiceId: invoice.id,
        amount,
        method,
        razorpayPaymentId: razorpayPaymentId || undefined,
        notes: notes || undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to reconcile payment");
        return;
      }
      toast.success("Payment reconciled successfully");
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Reconcile Payment" size="sm">
      <div className="space-y-4">
        {/* Invoice summary */}
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Invoice</p>
          <p className="text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</p>
          <p className="text-xs text-slate-500 mt-0.5">{invoice.customerName}</p>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Balance due</span>
            <span className="font-semibold text-red-600">{formatCurrency(invoice.balance)}</span>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Amount (paise) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={1}
            max={invoice.balance}
            step={1}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={INPUT_CLS}
          />
          {amount > invoice.balance && (
            <p className="mt-1 text-xs text-red-500">
              Cannot exceed balance of {formatCurrency(invoice.balance)}
            </p>
          )}
        </div>

        {/* Method */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Payment Method <span className="text-red-500">*</span>
          </label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={INPUT_CLS}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Razorpay Payment ID (optional) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Razorpay Payment ID{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={razorpayPaymentId}
            onChange={(e) => setRazorpayPaymentId(e.target.value)}
            placeholder="pay_xxxxxxxxxxxxx"
            className={INPUT_CLS}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Reference / Notes{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bank reference, UTR number..."
            className={INPUT_CLS}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isPending}
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <SubmitButton
            type="button"
            loading={isPending}
            loadingText="Reconciling..."
            disabled={!isAmountValid}
            onClick={handleSubmit}
          >
            Reconcile Payment
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
