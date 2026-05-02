"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  invoiceId: string;
  className?: string;
}

export function RazorpayCheckout({
  invoiceId,
  className,
}: RazorpayCheckoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const loadScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
      document.head.appendChild(script);
    });
  }, []);

  const handlePay = useCallback(async () => {
    setLoading(true);
    try {
      await loadScript();

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to create payment order");
        return;
      }

      const { data } = json;

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Payment",
        description: data.description,
        order_id: data.orderId,
        prefill: {
          name: data.customerName,
          email: data.customerEmail,
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId: data.invoiceId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyJson = await verifyRes.json();

            if (verifyRes.ok && verifyJson.success) {
              toast.success("Payment successful!");
              router.refresh();
            } else {
              toast.error(
                verifyJson.error || "Payment verification failed",
              );
            }
          } catch {
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  }, [invoiceId, loadScript, router]);

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className={
        className ??
        "inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
      }
    >
      {loading ? "Processing..." : "Pay Now"}
    </button>
  );
}
