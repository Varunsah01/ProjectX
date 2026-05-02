"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const CATEGORIES = [
  "Service Request",
  "Complaint",
  "Billing Query",
  "Renewal Request",
  "Other",
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;

export function TicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCategory = searchParams.get("category") || "";

  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState("medium");
  const [assetId, setAssetId] = useState("");
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/assets")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setAssets(json.data);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description,
          category,
          priority,
          assetId: assetId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to create ticket");
        return;
      }

      toast.success(`Ticket ${json.data.ticketNumber} created`);
      router.push(`/tickets/${json.data.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="subject"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Subject
        </label>
        <input
          id="subject"
          type="text"
          required
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Brief description of your issue"
        />
      </div>

      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Category
        </label>
        <select
          id="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="priority"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {assets.length > 0 && (
        <div>
          <label
            htmlFor="asset"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Related Asset{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            id="asset"
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">None</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          required
          maxLength={2000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
          placeholder="Describe your issue in detail"
        />
        <p className="text-xs text-slate-400 mt-1">
          {description.length}/2000
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Ticket"}
      </button>
    </form>
  );
}
