import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { parseReportFilters } from "@/lib/reports/period";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

export async function GET(req: Request) {
  try {
    await requirePermission("reports.view");

    const url = new URL(req.url);
    const { from, to, period } = parseReportFilters(url.searchParams);

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: subs, error } = await supabaseAdmin
      .from("sub_contractors")
      .select(`
        id,
        name,
        brn,
        vat_no,
        purchase_bills (
          id,
          bill_no,
          bill_date,
          due_date,
          status,
          total_amount,
          paid_amount,
          balance_amount
        )
      `)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("[reports/sub-contractor-payables]", error);
      return jsonError(500, { error: "Failed to load payable summary" });
    }

    const rows = (subs ?? []).map((sub) => {
      const allBills = Array.isArray(sub.purchase_bills) ? sub.purchase_bills : [];
      const bills = allBills.filter((bill) => {
        const billDate = String(bill.bill_date ?? "").slice(0, 10);
        if (!billDate) return true;
        return billDate >= from && billDate <= to;
      });

      const totalBilled = bills.reduce(
        (s, x) => s + Number(x.total_amount ?? 0),
        0
      );
      const totalPaid = bills.reduce(
        (s, x) => s + Number(x.paid_amount ?? 0),
        0
      );
      const totalOutstanding = bills.reduce(
        (s, x) => s + Number(x.balance_amount ?? 0),
        0
      );

      return {
        id: sub.id,
        name: sub.name,
        brn: sub.brn,
        vat_no: sub.vat_no,
        bills_count: bills.length,
        total_billed: Number(totalBilled.toFixed(2)),
        total_paid: Number(totalPaid.toFixed(2)),
        total_outstanding: Number(totalOutstanding.toFixed(2)),
      };
    });

    return NextResponse.json({
      ok: true,
      data: rows,
      meta: { period, from, to },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[reports/sub-contractor-payables]", e);
    return jsonError(500, { error: "Internal error" });
  }
}