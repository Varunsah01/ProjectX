"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface Tab {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeTab);

  return (
    <div className={className}>
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "whitespace-nowrap rounded-t-lg px-4 pb-3 pt-2 text-sm font-medium transition-all duration-150",
                activeTab === tab.id
                  ? "border-b-2 border-brand-600 text-brand-600 bg-brand-50/50"
                  : "border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "ml-2 rounded-full px-2 py-0.5 text-xs tabular-nums",
                    activeTab === tab.id
                      ? "bg-brand-100 text-brand-700"
                      : "bg-slate-100 text-slate-600"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">{active?.content}</div>
    </div>
  );
}
