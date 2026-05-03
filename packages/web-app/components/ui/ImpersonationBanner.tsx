"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ImpInfo {
  name: string;
  email: string;
}

export function ImpersonationBanner() {
  const router = useRouter();
  const [info, setInfo] = useState<ImpInfo | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)__imp_info=([^;]+)/);
    if (match?.[1]) {
      try {
        setInfo(JSON.parse(atob(match[1])));
      } catch {
        // ignore malformed cookie
      }
    }
  }, []);

  if (!info) return null;

  async function endSession() {
    setEnding(true);
    try {
      await fetch("/api/admin/impersonate/end", { method: "POST" });
    } finally {
      router.push("/admin/lookup");
      router.refresh();
    }
  }

  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-orange-300 bg-orange-50 px-4 py-3">
      <span className="flex-1 text-sm font-medium text-orange-800">
        👁 Impersonating{" "}
        <strong>{info.name}</strong>{" "}
        <span className="font-normal text-orange-600">({info.email})</span>
        {" "}— all actions are logged
      </span>
      <button
        onClick={endSession}
        disabled={ending}
        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {ending ? "Ending…" : "End Session"}
      </button>
    </div>
  );
}
