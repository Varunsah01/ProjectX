import { getReportsData } from "@/lib/queries/reports";
import ReportsPageClient from "./page-client";

type ReportPreset = "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "custom";

const VALID_PRESETS: ReportPreset[] = [
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "custom",
];

function getPresetDates(
  preset: ReportPreset,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (preset) {
    case "last_month":
      return {
        from: new Date(year, month - 1, 1),
        to: new Date(year, month, 0, 23, 59, 59),
      };
    case "this_quarter": {
      const qs = Math.floor(month / 3) * 3;
      return {
        from: new Date(year, qs, 1),
        to: new Date(year, qs + 3, 0, 23, 59, 59),
      };
    }
    case "last_quarter": {
      const currentQs = Math.floor(month / 3) * 3;
      if (currentQs === 0) {
        return {
          from: new Date(year - 1, 9, 1),
          to: new Date(year - 1, 11, 31, 23, 59, 59),
        };
      }
      const qs = currentQs - 3;
      return {
        from: new Date(year, qs, 1),
        to: new Date(year, qs + 3, 0, 23, 59, 59),
      };
    }
    case "this_year":
      return {
        from: new Date(year, 0, 1),
        to: new Date(year, 11, 31, 23, 59, 59),
      };
    case "custom": {
      const from = customFrom ? new Date(customFrom) : new Date(year, month, 1);
      const to = customTo
        ? new Date(customTo + "T23:59:59")
        : new Date(year, month + 1, 0, 23, 59, 59);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        return {
          from: new Date(year, month, 1),
          to: new Date(year, month + 1, 0, 23, 59, 59),
        };
      }
      return { from, to };
    }
    default: // this_month
      return {
        from: new Date(year, month, 1),
        to: new Date(year, month + 1, 0, 23, 59, 59),
      };
  }
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; preset?: string };
}) {
  const preset: ReportPreset = VALID_PRESETS.includes(
    searchParams.preset as ReportPreset,
  )
    ? (searchParams.preset as ReportPreset)
    : "this_month";

  const { from, to } = getPresetDates(preset, searchParams.from, searchParams.to);
  const data = await getReportsData(from, to);

  return (
    <ReportsPageClient
      data={data}
      from={toDateStr(from)}
      to={toDateStr(to)}
      preset={preset}
    />
  );
}
