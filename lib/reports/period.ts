// lib/reports/period.ts
//
// Shared date-range and grouping helpers for report APIs and pages.
// Keeping this in one place means every report can support the same set of
// quick filters, custom ranges, and grouping without re-implementing date
// math per page.

export type QuickFilterKey =
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "last_quarter"
  | "this_year"
  | "last_year"
  | "financial_year"
  | "custom";

export type GroupByKey = "day" | "month" | "quarter" | "year";

export type DateRange = {
  from: string; // yyyy-mm-dd, inclusive
  to: string; // yyyy-mm-dd, inclusive
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0, 1);
}

function endOfMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0);
}

/**
 * Mauritius financial year: 1 July – 30 June. Adjust FINANCIAL_YEAR_START_MONTH
 * (0-indexed) if your business uses a different fiscal calendar.
 */
const FINANCIAL_YEAR_START_MONTH = 6; // July

/**
 * Resolve a quick filter key (or explicit custom from/to) into a concrete
 * { from, to } date range. `now` is injectable for testing.
 */
export function resolveDateRange(
  key: QuickFilterKey,
  custom?: { from?: string | null; to?: string | null },
  now: Date = new Date()
): DateRange {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  switch (key) {
    case "this_month": {
      return {
        from: toISODate(startOfMonth(year, month)),
        to: toISODate(endOfMonth(year, month)),
      };
    }
    case "last_month": {
      const m = month - 1;
      const y = m < 0 ? year - 1 : year;
      const mm = (m + 12) % 12;
      return {
        from: toISODate(startOfMonth(y, mm)),
        to: toISODate(endOfMonth(y, mm)),
      };
    }
    case "this_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3;
      return {
        from: toISODate(startOfMonth(year, qStartMonth)),
        to: toISODate(endOfMonth(year, qStartMonth + 2)),
      };
    }
    case "last_quarter": {
      const qStartMonth = Math.floor(month / 3) * 3 - 3;
      const y = qStartMonth < 0 ? year - 1 : year;
      const mm = (qStartMonth + 12) % 12;
      return {
        from: toISODate(startOfMonth(y, mm)),
        to: toISODate(endOfMonth(y, mm + 2)),
      };
    }
    case "this_year": {
      return {
        from: toISODate(new Date(year, 0, 1)),
        to: toISODate(new Date(year, 11, 31)),
      };
    }
    case "last_year": {
      return {
        from: toISODate(new Date(year - 1, 0, 1)),
        to: toISODate(new Date(year - 1, 11, 31)),
      };
    }
    case "financial_year": {
      // If we're before the FY start month, the current FY began last
      // calendar year.
      const fyStartYear = month >= FINANCIAL_YEAR_START_MONTH ? year : year - 1;
      const start = new Date(fyStartYear, FINANCIAL_YEAR_START_MONTH, 1);
      const end = new Date(fyStartYear + 1, FINANCIAL_YEAR_START_MONTH, 0);
      return { from: toISODate(start), to: toISODate(end) };
    }
    case "custom":
    default: {
      const from = custom?.from?.trim() || toISODate(startOfMonth(year, month));
      const to = custom?.to?.trim() || toISODate(endOfMonth(year, month));
      return { from, to };
    }
  }
}

/** Parse a request's query params into a resolved date range + grouping. */
export function parseReportFilters(searchParams: URLSearchParams) {
  const rawKey = (searchParams.get("period") ?? "this_month") as QuickFilterKey;
  const validKeys: QuickFilterKey[] = [
    "this_month",
    "last_month",
    "this_quarter",
    "last_quarter",
    "this_year",
    "last_year",
    "financial_year",
    "custom",
  ];
  const key = validKeys.includes(rawKey) ? rawKey : "this_month";

  const range = resolveDateRange(key, {
    from: searchParams.get("from"),
    to: searchParams.get("to"),
  });

  const rawGroup = (searchParams.get("group") ?? "month") as GroupByKey;
  const validGroups: GroupByKey[] = ["day", "month", "quarter", "year"];
  const group = validGroups.includes(rawGroup) ? rawGroup : "month";

  return { period: key, group, ...range };
}

/** Bucket label for a given date under a grouping mode, e.g. "2026-07" for month. */
export function bucketLabel(dateStr: string, group: GroupByKey): string {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "Unknown";

  const y = d.getFullYear();
  const m = d.getMonth();

  switch (group) {
    case "day":
      return toISODate(d);
    case "quarter":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "year":
      return String(y);
    case "month":
    default:
      return `${y}-${pad2(m + 1)}`;
  }
}
