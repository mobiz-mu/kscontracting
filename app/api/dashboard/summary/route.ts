// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePermission } from "@/lib/authz";

export const runtime = "nodejs";

function n2(v: unknown) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

export async function GET() {
  try {
    await requirePermission("dashboard.view");

    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // KPIs (simple + safe)
    // monthSales: sum of totals for ISSUED/PARTIALLY_PAID/PAID in current month
    // totalOutstanding: sum of balance_amount for ISSUED/PARTIALLY_PAID
    // invoiceCount: all invoices count
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthStartISO = monthStart.toISOString().slice(0, 10);

    const { data: allInvoices, error: invErr } = await supabase
      .from("invoices")
      .select("status,total_amount,balance_amount,invoice_date,invoice_type", { count: "exact" });

    if (invErr) throw invErr;

    type SummaryInvoiceRow = {
      status: string | null;
      total_amount: number | null;
      balance_amount: number | null;
      invoice_date: string | null;
      invoice_type: string | null;
    };

    const invoices = ((allInvoices ?? []) as SummaryInvoiceRow[]).filter(
      (i) => String(i.invoice_type ?? "").toUpperCase() !== "PRO_FORMA"
    );

    const invoiceCount = invoices.length;

    const monthSales = invoices
      .filter((i) => {
        const d = String(i.invoice_date ?? "").slice(0, 10);
        const okStatus = ["ISSUED", "PARTIALLY_PAID", "PAID"].includes(String(i.status));
        return okStatus && d >= monthStartISO;
      })
      .reduce((sum, i) => sum + n2(i.total_amount), 0);

    const totalOutstanding = invoices
      .filter((i) => ["ISSUED", "PARTIALLY_PAID"].includes(String(i.status)))
      .reduce((sum, i) => sum + n2(i.balance_amount), 0);

    const statusKeys = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "VOID"] as const;
    const statusCounts = statusKeys.map((k) => ({
      key: k,
      status: k.replace("_", " "),
      count: invoices.filter((i) => String(i.status) === k).length,
    }));

    const totalForPercent = Math.max(
      1,
      statusCounts.reduce((s, x) => s + x.count, 0)
    );

    const invoicesByStatus = statusCounts.map((x) => ({
      ...x,
      percent: Math.round((x.count / totalForPercent) * 1000) / 10, // 1 decimal
    }));

    return NextResponse.json({
      ok: true,
      refreshedAt: new Date().toISOString(),
      kpis: {
        monthSales,
        totalOutstanding,
        invoiceCount,
      },
      invoicesByStatus,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (msg === "Forbidden") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    console.error("[dashboard/summary]", e);
    return NextResponse.json(
      { ok: false, error: "Failed to load dashboard summary" },
      { status: 500 }
    );
  }
}