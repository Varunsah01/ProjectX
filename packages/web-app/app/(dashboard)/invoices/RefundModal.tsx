"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initiateRefund } from "@/lib/actions/refunds";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/lib/types";

const INPUT_CLS =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all";

interface Props {
  payment: Payment;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RefundModal({ payment, isOpen, onClose, onSuccess }: Props) {
  const refundableRupees = Math.max(
    0,
    (payment.amount - payment.refundedAmountPaisa) / 100,
  );

  const [amount, setAmount] = useState(refundableRupees);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      setAmount(refundableRupees);
      setReason("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, payment.id]);

  const isAmountValid = amount > 0 && amount <= refundableRupees;
  const isReasonValid = reason.trim().length > 0;

  function handleClose() {
    if (!isPending) onClose();
  }

  function handleSubmit() {
    if (!isAmountValid || !isReasonValid) return;
    startTransition(async () => {
      const result = await initiateRefund({
        paymentId: payment.id,
        amountPaisa: Math.round(amount * 100),
        reason: reason.trim(),
      });
      if (!result.success) {
        toast.error(result.error ?? "Failed to initiate refund");
        return;
      }
      toast.success("Refund initiated. Status will update once Razorpay processes it.");
      onClose();
      onSuccess();
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Initiate Refund" size="sm">
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Payment</p>
          <p className="text-sm font-semibold text-slate-900">
            {payment.razorpayPaymentId ?? payment.id}
          </p>
          <div className="mt-1.5 flex justify-between text-xs">
            <span className="text-slate-500">Refundable balance</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(refundableRupees)}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Refund Amount (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            max={refundableRupees}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className={INPUT_CLS}
          />
          {amount > refundableRupees && (
            <p className="mt-1 text-xs text-red-500">
              Cannot exceed refundable balance of {formatCurrency(refundableRupees)}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Customer request, duplicate charge, service not delivered…"
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
            loadingText="Initiating…"
            disabled={!isAmountValid || !isReasonValid}
            onClick={handleSubmit}
          >
            Initiate Refund
          </SubmitButton>
        </div>
      </div>
    </Modal>
  );
}
