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

function calcTotals(items: Array<{ description?: unknown; qty?: unknown; unit_price?: unknown; vat_rate?: unknown }>) {
  const normalized = (items ?? []).map((item) => {
    const qty = n2(item.qty || 0);
    const unitPrice = n2(item.unit_price || 0);
    const vatRate = n2(item.vat_rate || 0);
    const lineSubtotal = qty * unitPrice;
    const vatAmount = lineSubtotal * (vatRate / 100);
    const lineTotal = lineSubtotal + vatAmount;

    return {
      description: String(item.description ?? "").trim(),
      qty,
      unit_price: unitPrice,
      vat_rate: vatRate,
      vat_amount: Number(vatAmount.toFixed(2)),
      line_total: Number(lineTotal.toFixed(2)),
    };
  });

  const subtotal = normalized.reduce((s, x) => s + x.qty * x.unit_price, 0);
  const vatAmount = normalized.reduce((s, x) => s + x.vat_amount, 0);
  const totalAmount = subtotal + vatAmount;

  return {
    items: normalized,
    subtotal: Number(subtotal.toFixed(2)),
    vat_amount: Number(vatAmount.toFixed(2)),
    total_amount: Number(totalAmount.toFixed(2)),
    paid_amount: 0,
    balance_amount: Number(totalAmount.toFixed(2)),
  };
}

export async function GET(req: Request) {
  try {
    await requirePermission("purchase_bills.view");

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();

    const supabaseAdmin = createSupabaseAdminClient();

    let query = supabaseAdmin
      .from("purchase_bills")
      .select(`
        id,
        bill_no,
        sub_contractor_id,
        bill_date,
        due_date,
        status,
        description,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        notes,
        created_at,
        updated_at,
        sub_contractors (
          id,
          name,
          brn,
          vat_no,
          phone
        )
      `)
      .order("created_at", { ascending: false });

    if (q) {
      query = query.or(
        `bill_no.ilike.%${q}%,description.ilike.%${q}%,notes.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error("[purchase-bills]", error);
      return jsonError(500, { error: "Failed to load purchase bills" });
    }

    return NextResponse.json({
      ok: true,
      data: data ?? [],
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[purchase-bills]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission("purchase_bills.create");

    const supabaseAdmin = createSupabaseAdminClient();
    const body = await req.json().catch(() => ({}));

    const billNo = String(body.bill_no ?? "").trim();
    const subContractorId = Number(body.sub_contractor_id ?? 0);
    const billDate = String(body.bill_date ?? "").trim();
    const dueDate = String(body.due_date ?? "").trim() || null;
    const status = String(body.status ?? "DRAFT").trim() || "DRAFT";
    const description = String(body.description ?? "").trim() || null;
    const notes = String(body.notes ?? "").trim() || null;
    type RawBillItemInput = { description?: unknown; qty?: unknown; unit_price?: unknown; vat_rate?: unknown };
    const itemsInput: RawBillItemInput[] = Array.isArray(body.items) ? body.items : [];

    if (!billNo) {
      return jsonError(400, { error: "bill_no is required" });
    }

    if (!subContractorId) {
      return jsonError(400, { error: "sub_contractor_id is required" });
    }

    if (!billDate) {
      return jsonError(400, { error: "bill_date is required" });
    }

    const validItems = itemsInput.filter(
      (x) => String(x?.description ?? "").trim() !== ""
    );

    if (validItems.length === 0) {
      return jsonError(400, { error: "At least one item is required" });
    }

    const totals = calcTotals(validItems);

    const { data: bill, error: billError } = await supabaseAdmin
      .from("purchase_bills")
      .insert({
        bill_no: billNo,
        sub_contractor_id: subContractorId,
        bill_date: billDate,
        due_date: dueDate,
        status,
        description,
        subtotal: totals.subtotal,
        vat_amount: totals.vat_amount,
        total_amount: totals.total_amount,
        paid_amount: 0,
        balance_amount: totals.balance_amount,
        notes,
      })
      .select("*")
      .single();

    if (billError || !bill) {
      console.error("[purchase-bills]", billError);
      return jsonError(500, { error: "Failed to create purchase bill" });
    }

    const itemsPayload = totals.items.map((item) => ({
      purchase_bill_id: bill.id,
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      vat_amount: item.vat_amount,
      line_total: item.line_total,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("purchase_bill_items")
      .insert(itemsPayload);

    if (itemsError) {
      await supabaseAdmin.from("purchase_bills").delete().eq("id", bill.id);

      console.error("[purchase-bills]", itemsError);
      return jsonError(500, { error: "Failed to create purchase bill items" });
    }

    return NextResponse.json({ ok: true, data: bill }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[purchase-bills]", e);
      return jsonError(500, { error: "Internal error" });
  }
}