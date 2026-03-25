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

function n2(v: any) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const supabaseAdmin = createSupabaseAdminClient();

    let query = supabaseAdmin
      .from("sub_contractor_payments")
      .select(`
        id,
        payment_no,
        sub_contractor_id,
        purchase_bill_id,
        payment_date,
        payment_method,
        reference_no,
        amount,
        notes,
        created_at,
        updated_at,
        sub_contractors (
          id,
          name
        ),
        purchase_bills (
          id,
          bill_no
        )
      `)
      .order("payment_date", { ascending: false })
      .order("id", { ascending: false });

    if (q) {
      query = query.or(
        `payment_no.ilike.%${q}%,reference_no.ilike.%${q}%,notes.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return jsonError(500, {
        error: "Failed to load sub contractor payments",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({
      ok: true,
      data: data ?? [],
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}

export async function POST(req: Request) {
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
    const body = await req.json().catch(() => ({}));

    const paymentNo = String(body.payment_no ?? "").trim();
    const subContractorId = Number(body.sub_contractor_id ?? 0);
    const purchaseBillId = body.purchase_bill_id ? Number(body.purchase_bill_id) : null;
    const paymentDate = String(body.payment_date ?? "").trim();
    const paymentMethod = String(body.payment_method ?? "").trim() || null;
    const referenceNo = String(body.reference_no ?? "").trim() || null;
    const amount = n2(body.amount);
    const notes = String(body.notes ?? "").trim() || null;

    if (!paymentNo) {
      return jsonError(400, { error: "payment_no is required" });
    }

    if (!subContractorId) {
      return jsonError(400, { error: "sub_contractor_id is required" });
    }

    if (!paymentDate) {
      return jsonError(400, { error: "payment_date is required" });
    }

    if (amount <= 0) {
      return jsonError(400, { error: "amount must be greater than zero" });
    }

    if (purchaseBillId) {
      const { data: bill, error: billError } = await supabaseAdmin
        .from("purchase_bills")
        .select("id, sub_contractor_id, balance_amount")
        .eq("id", purchaseBillId)
        .single();

      if (billError || !bill) {
        return jsonError(400, {
          error: "Selected purchase bill not found",
          supabaseError: safeError(billError),
        });
      }

      if (Number(bill.sub_contractor_id) !== subContractorId) {
        return jsonError(400, {
          error: "Selected purchase bill does not belong to this sub contractor",
        });
      }

      if (amount > Number(bill.balance_amount ?? 0)) {
        return jsonError(400, {
          error: "Payment amount exceeds the bill outstanding balance",
        });
      }
    }

    const { data, error } = await supabaseAdmin
      .from("sub_contractor_payments")
      .insert({
        payment_no: paymentNo,
        sub_contractor_id: subContractorId,
        purchase_bill_id: purchaseBillId,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_no: referenceNo,
        amount,
        notes,
      })
      .select("*")
      .single();

    if (error) {
      return jsonError(500, {
        error: "Failed to create sub contractor payment",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}