import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import {
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
}

function n2(v: unknown) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  try {
    await requirePermission("purchase_bills.view");

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
      console.error("[sub-contractor-payments]", error);
      return jsonError(500, { error: "Failed to load sub contractor payments" });
    }

    return NextResponse.json({
      ok: true,
      data: data ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[sub-contractor-payments]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("purchase_bills.create");

    const supabaseAdmin = createSupabaseAdminClient();
    const body = await req.json().catch(() => ({}));

    const paymentNo =
      typeof body.payment_no === "string" ? body.payment_no.trim() || null : null;

    const subContractorId = Number(body.sub_contractor_id ?? 0);
    const purchaseBillId = body.purchase_bill_id ? Number(body.purchase_bill_id) : null;
    const paymentDate = String(body.payment_date ?? "").trim();
    const paymentMethod = String(body.payment_method ?? "").trim() || null;
    const referenceNo = String(body.reference_no ?? "").trim() || null;
    const amount = n2(body.amount);
    const notes = String(body.notes ?? "").trim() || null;

    if (!subContractorId) {
      return jsonError(400, { error: "sub_contractor_id is required" });
    }

    if (!paymentDate) {
      return jsonError(400, { error: "payment_date is required" });
    }

    if (amount <= 0) {
      return jsonError(400, { error: "amount must be greater than zero" });
    }

    const { data: rpcResult, error: rpcErr } = await supabaseAdmin.rpc(
      "record_sub_contractor_payment",
      {
        p_sub_contractor_id: subContractorId,
        p_purchase_bill_id: purchaseBillId,
        p_payment_no: paymentNo,
        p_payment_date: paymentDate,
        p_payment_method: paymentMethod,
        p_reference_no: referenceNo,
        p_amount: amount,
        p_notes: notes,
      }
    );

    if (rpcErr) {
      const msg = String(rpcErr.message ?? "");
      if (msg.includes("BILL_NOT_FOUND")) {
        return jsonError(400, { error: "Selected purchase bill not found" });
      }
      if (msg.includes("BILL_VOID")) {
        return jsonError(400, { error: "Cannot add a payment to a void purchase bill" });
      }
      if (msg.includes("BILL_DRAFT")) {
        return jsonError(400, {
          error: "Cannot add a payment to a draft purchase bill. Update its status first.",
        });
      }
      if (msg.includes("BILL_CONTRACTOR_MISMATCH")) {
        return jsonError(400, {
          error: "Selected purchase bill does not belong to this sub contractor",
        });
      }
      if (msg.includes("AMOUNT_EXCEEDS_BALANCE")) {
        return jsonError(400, { error: "Payment amount exceeds the bill outstanding balance" });
      }
      if (msg.includes("INVALID_AMOUNT")) {
        return jsonError(400, { error: "amount must be greater than zero" });
      }
      console.error("[sub-contractor-payments]", rpcErr);
      return jsonError(500, { error: "Failed to create sub contractor payment" });
    }

    return NextResponse.json({ ok: true, data: rpcResult?.payment ?? null }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[sub-contractor-payments]", e);
    return jsonError(500, { error: "Internal error" });
  }
}