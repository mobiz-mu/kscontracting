import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    await requirePermission("reports.view");

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: sub, error: subError } = await supabaseAdmin
      .from("sub_contractors")
      .select("id, name, brn, vat_no, phone, email, address")
      .eq("id", id)
      .single();

    if (subError || !sub) {
      console.error("[reports/sub-contractor-ledger/[id]]", subError);
      return jsonError(404, { error: "Sub contractor not found" });
    }

    const { data: bills, error: billsError } = await supabaseAdmin
      .from("purchase_bills")
      .select(`
        id,
        bill_no,
        bill_date,
        due_date,
        status,
        total_amount,
        paid_amount,
        balance_amount
      `)
      .eq("sub_contractor_id", id)
      .order("bill_date", { ascending: true })
      .order("id", { ascending: true });

    if (billsError) {
      console.error("[reports/sub-contractor-ledger/[id]]", billsError);
      return jsonError(500, { error: "Failed to load purchase bills" });
    }

    const { data: payments, error: paymentsError } = await supabaseAdmin
      .from("sub_contractor_payments")
      .select(`
        id,
        payment_no,
        purchase_bill_id,
        payment_date,
        payment_method,
        reference_no,
        amount,
        notes
      `)
      .eq("sub_contractor_id", id)
      .order("payment_date", { ascending: true })
      .order("id", { ascending: true });

    if (paymentsError) {
      console.error("[reports/sub-contractor-ledger/[id]]", paymentsError);
      return jsonError(500, { error: "Failed to load payments" });
    }

    const ledger = [
      ...(bills ?? []).map((b) => ({
        type: "BILL",
        date: b.bill_date,
        ref_no: b.bill_no,
        description: `Purchase Bill ${b.bill_no}`,
        debit: Number(b.total_amount ?? 0),
        credit: 0,
        purchase_bill_id: b.id,
      })),
      ...(payments ?? []).map((p) => ({
        type: "PAYMENT",
        date: p.payment_date,
        ref_no: p.payment_no,
        description: p.purchase_bill_id
          ? `Payment for bill ID ${p.purchase_bill_id}`
          : "General payment",
        debit: 0,
        credit: Number(p.amount ?? 0),
        purchase_bill_id: p.purchase_bill_id,
      })),
    ].sort((a, b) => {
      const da = String(a.date ?? "");
      const db = String(b.date ?? "");
      if (da < db) return -1;
      if (da > db) return 1;
      return 0;
    });

    let runningBalance = 0;
    const ledgerWithBalance = ledger.map((row) => {
      runningBalance += Number(row.debit ?? 0) - Number(row.credit ?? 0);
      return {
        ...row,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        sub_contractor: sub,
        bills: bills ?? [],
        payments: payments ?? [],
        ledger: ledgerWithBalance,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[reports/sub-contractor-ledger/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}