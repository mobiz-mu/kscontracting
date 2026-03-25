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

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

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
      return jsonError(500, {
        error: "Failed to load payable summary",
        supabaseError: safeError(error),
      });
    }

    const rows = (subs ?? []).map((sub: any) => {
      const bills = Array.isArray(sub.purchase_bills) ? sub.purchase_bills : [];

      const totalBilled = bills.reduce(
        (s: number, x: any) => s + Number(x.total_amount ?? 0),
        0
      );
      const totalPaid = bills.reduce(
        (s: number, x: any) => s + Number(x.paid_amount ?? 0),
        0
      );
      const totalOutstanding = bills.reduce(
        (s: number, x: any) => s + Number(x.balance_amount ?? 0),
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
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}