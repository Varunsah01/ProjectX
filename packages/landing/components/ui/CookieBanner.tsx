"use client";

import { useEffect, useState } from "react";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("analytics_consent")) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function accept() {
    localStorage.setItem("analytics_consent", "granted");
    window.dispatchEvent(new Event("analytics:consent_granted"));
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("analytics_consent", "denied");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200 sm:bottom-6 sm:left-6 sm:right-auto sm:p-5"
    >
      <p className="text-sm text-slate-600">
        We use analytics cookies to understand how visitors use our site and
        improve it.{" "}
        <a
          href="/privacy"
          className="underline underline-offset-2 hover:text-slate-900"
        >
          Privacy policy
        </a>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={accept}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Accept
        </button>
        <button
          onClick={decline}
          className="rounded-lg px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
