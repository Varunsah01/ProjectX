"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { customers } from "@/lib/mock-data";

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [type, setType] = useState("recurring");
  const [items, setItems] = useState<LineItem[]>([
    { description: "", qty: 1, rate: 0 },
  ]);

  const addItem = () =>
    setItems([...items, { description: "", qty: 1, rate: 0 }]);

  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof LineItem, value: string | number) =>
    setItems(
      items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );

  const total = items.reduce((sum, item) => sum + item.qty * item.rate, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/invoices");
  };

  return (
    <div>
      <PageHeader
        title="Create Invoice"
        breadcrumbs={[
          { label: "Invoices", href: "/invoices" },
          { label: "Create Invoice" },
        ]}
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl rounded-xl border border-slate-200 bg-white p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Customer *
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="recurring">Recurring</option>
              <option value="one_time">One Time</option>
              <option value="service">Service</option>
            </select>
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-3">
            Line Items
          </h3>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) =>
                    updateItem(i, "description", e.target.value)
                  }
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  min={1}
                  value={item.qty}
                  onChange={(e) =>
                    updateItem(i, "qty", parseInt(e.target.value) || 0)
                  }
                  className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  min={0}
                  value={item.rate || ""}
                  onChange={(e) =>
                    updateItem(i, "rate", parseFloat(e.target.value) || 0)
                  }
                  className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="w-24 py-2 text-right text-sm font-medium text-slate-900">
                  Rs {(item.qty * item.rate).toLocaleString("en-IN")}
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  className="mt-1.5 rounded p-1 text-slate-400 hover:text-red-500 disabled:opacity-30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-3 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </button>
        </div>

        {/* Total */}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <div className="w-48">
            <div className="flex justify-between text-lg font-bold">
              <span className="text-slate-900">Total</span>
              <span className="text-slate-900">
                Rs {total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create Invoice
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
