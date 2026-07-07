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
  };
}

type Ctx = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    await requirePermission("purchase_bills.view");

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: bill, error: billError } = await supabaseAdmin
      .from("purchase_bills")
      .select(`
        *,
        sub_contractors (
          id,
          name,
          brn,
          vat_no,
          phone,
          email,
          address,
          contact_person
        )
      `)
      .eq("id", id)
      .single();

    if (billError || !bill) {
      console.error("[purchase-bills/[id]]", billError);
      return jsonError(404, { error: "Purchase bill not found" });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("purchase_bill_items")
      .select("*")
      .eq("purchase_bill_id", id)
      .order("id", { ascending: true });

    if (itemsError) {
      console.error("[purchase-bills/[id]]", itemsError);
      return jsonError(500, { error: "Failed to load purchase bill items" });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...bill,
        items: items ?? [],
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[purchase-bills/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

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
    const paidAmount = n2(body.paid_amount ?? 0);
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
    const balanceAmount = Math.max(0, totals.total_amount - paidAmount);

    const { data: bill, error: updateError } = await supabaseAdmin
      .from("purchase_bills")
      .update({
        bill_no: billNo,
        sub_contractor_id: subContractorId,
        bill_date: billDate,
        due_date: dueDate,
        status,
        description,
        subtotal: totals.subtotal,
        vat_amount: totals.vat_amount,
        total_amount: totals.total_amount,
        paid_amount: paidAmount,
        balance_amount: Number(balanceAmount.toFixed(2)),
        notes,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !bill) {
      console.error("[purchase-bills/[id]]", updateError);
      return jsonError(500, { error: "Failed to update purchase bill" });
    }

    const { error: deleteItemsError } = await supabaseAdmin
      .from("purchase_bill_items")
      .delete()
      .eq("purchase_bill_id", id);

    if (deleteItemsError) {
      console.error("[purchase-bills/[id]]", deleteItemsError);
      return jsonError(500, { error: "Failed to replace purchase bill items" });
    }

    const itemsPayload = totals.items.map((item) => ({
      purchase_bill_id: Number(id),
      description: item.description,
      qty: item.qty,
      unit_price: item.unit_price,
      vat_rate: item.vat_rate,
      vat_amount: item.vat_amount,
      line_total: item.line_total,
    }));

    const { error: insertItemsError } = await supabaseAdmin
      .from("purchase_bill_items")
      .insert(itemsPayload);

    if (insertItemsError) {
      console.error("[purchase-bills/[id]]", insertItemsError);
      return jsonError(500, { error: "Failed to save purchase bill items" });
    }

    return NextResponse.json({ ok: true, data: bill });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[purchase-bills/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;

    await requirePermission("purchase_bills.delete");

    const supabaseAdmin = createSupabaseAdminClient();

    const { error } = await supabaseAdmin
      .from("purchase_bills")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[purchase-bills/[id]]", error);
      return jsonError(500, { error: "Failed to delete purchase bill" });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "Unauthorized") return jsonError(401, { error: "Unauthorized" });
    if (msg === "Forbidden") return jsonError(403, { error: "Forbidden" });
    console.error("[purchase-bills/[id]]", e);
      return jsonError(500, { error: "Internal error" });
  }
}