"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void | Promise<void>;
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (
    event: "payment.failed",
    handler: (response: {
      error?: {
        description?: string;
      };
    }) => void,
  ) => void;
}

interface CreateOrderResponse {
  success: true;
  data: {
    keyId?: string;
    orderId: string;
    amount: number;
    currency: string;
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail?: string | null;
    description: string;
  };
}

const RAZORPAY_CHECKOUT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let checkoutScriptPromise: Promise<boolean> | null = null;

function loadCheckoutScript() {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (!checkoutScriptPromise) {
    checkoutScriptPromise = new Promise((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${RAZORPAY_CHECKOUT_URL}"]`,
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(true), { once: true });
        existingScript.addEventListener("error", () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_URL;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return checkoutScriptPromise;
}

export function PaymentButton({
  invoiceId,
  amount,
  label = "Collect Payment",
  className,
  disabled = false,
  onSuccess,
}: {
  invoiceId: string;
  amount: number;
  label?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "starting" | "verifying">("idle");

  const isLoading = state !== "idle";

  const buttonClassName =
    className ??
    "inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70";

  const handleClick = async () => {
    if (disabled || isLoading || amount <= 0) {
      return;
    }

    setState("starting");

    try {
      const orderResponse = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId,
          amount,
        }),
      });

      const orderPayload = (await orderResponse.json()) as
        | CreateOrderResponse
        | { error?: string };

      if (!orderResponse.ok || !("success" in orderPayload)) {
        const errorMessage =
          "error" in orderPayload
            ? orderPayload.error
            : "Unable to create payment order";

        throw new Error(errorMessage);
      }

      if (!orderPayload.data.keyId) {
        throw new Error("Missing Razorpay key id");
      }

      const scriptLoaded = await loadCheckoutScript();

      if (!scriptLoaded || !window.Razorpay) {
        throw new Error("Unable to load Razorpay checkout");
      }

      const razorpay = new window.Razorpay({
        key: orderPayload.data.keyId,
        amount: orderPayload.data.amount,
        currency: orderPayload.data.currency,
        name: "Recuring",
        description: orderPayload.data.description,
        order_id: orderPayload.data.orderId,
        prefill: {
          name: orderPayload.data.customerName,
          email: orderPayload.data.customerEmail ?? undefined,
        },
        notes: {
          invoiceId: orderPayload.data.invoiceId,
          invoiceNumber: orderPayload.data.invoiceNumber,
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: () => {
            setState("idle");
          },
        },
        handler: async (response) => {
          setState("verifying");

          try {
            const verifyResponse = await fetch("/api/payments/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                invoiceId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            const verifyPayload = (await verifyResponse.json()) as
              | { success: true }
              | { error?: string };

            if (!verifyResponse.ok || !("success" in verifyPayload)) {
              const errorMessage =
                "error" in verifyPayload
                  ? verifyPayload.error
                  : "Unable to verify payment";

              throw new Error(errorMessage);
            }

            toast.success("Payment received successfully");
            onSuccess?.();
            router.refresh();
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : "Unable to verify payment",
            );
          } finally {
            setState("idle");
          }
        },
      });

      razorpay.on("payment.failed", (response) => {
        toast.error(response.error?.description ?? "Payment failed");
        setState("idle");
      });

      razorpay.open();
      setState("idle");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to start payment",
      );
      setState("idle");
    }
  };

  return (
    <button
      type="button"
      disabled={disabled || isLoading || amount <= 0}
      onClick={handleClick}
      className={buttonClassName}
    >
      {isLoading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {state === "verifying" ? "Verifying..." : state === "starting" ? "Opening..." : label}
    </button>
  );
}
