// app/api/dashboard/summary/route.ts
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function n2(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

export async function GET() {
  try {
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

    // Auth guard (returns JSON, not HTML redirect)
    const { data: userRes, error: uErr } = await supabase.auth.getUser();
    if (uErr || !userRes.user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // KPIs (simple + safe)
    // monthSales: sum of totals for ISSUED/PARTIALLY_PAID/PAID in current month
    // totalOutstanding: sum of balance_amount for ISSUED/PARTIALLY_PAID
    // invoiceCount: all invoices count
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthStartISO = monthStart.toISOString().slice(0, 10);

    const { data: allInvoices, error: invErr } = await supabase
      .from("invoices")
      .select("status,total_amount,balance_amount,invoice_date", { count: "exact" });

    if (invErr) throw invErr;

    const invoices = (allInvoices ?? []) as Array<any>;

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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}