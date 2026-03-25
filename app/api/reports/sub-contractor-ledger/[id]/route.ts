import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: any) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function safeError(err: any) {
  return {
    message: err?.message ?? "Unknown error",
    code: err?.code ?? null,
    details: err?.details ?? null,
    hint: err?.hint ?? null,
  };
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: sub, error: subError } = await supabaseAdmin
      .from("sub_contractors")
      .select("id, name, brn, vat_no, phone, email, address")
      .eq("id", id)
      .single();

    if (subError || !sub) {
      return jsonError(404, {
        error: "Sub contractor not found",
        supabaseError: safeError(subError),
      });
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
      return jsonError(500, {
        error: "Failed to load purchase bills",
        supabaseError: safeError(billsError),
      });
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
      return jsonError(500, {
        error: "Failed to load payments",
        supabaseError: safeError(paymentsError),
      });
    }

    const ledger = [
      ...(bills ?? []).map((b: any) => ({
        type: "BILL",
        date: b.bill_date,
        ref_no: b.bill_no,
        description: `Purchase Bill ${b.bill_no}`,
        debit: Number(b.total_amount ?? 0),
        credit: 0,
        purchase_bill_id: b.id,
      })),
      ...(payments ?? []).map((p: any) => ({
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
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}