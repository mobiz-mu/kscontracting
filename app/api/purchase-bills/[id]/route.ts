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

function calcTotals(items: any[]) {
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

    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

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
      return jsonError(404, {
        error: "Purchase bill not found",
        supabaseError: safeError(billError),
      });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("purchase_bill_items")
      .select("*")
      .eq("purchase_bill_id", id)
      .order("id", { ascending: true });

    if (itemsError) {
      return jsonError(500, {
        error: "Failed to load purchase bill items",
        supabaseError: safeError(itemsError),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...bill,
        items: items ?? [],
      },
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
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
    const body = await req.json().catch(() => ({}));

    const billNo = String(body.bill_no ?? "").trim();
    const subContractorId = Number(body.sub_contractor_id ?? 0);
    const billDate = String(body.bill_date ?? "").trim();
    const dueDate = String(body.due_date ?? "").trim() || null;
    const status = String(body.status ?? "DRAFT").trim() || "DRAFT";
    const description = String(body.description ?? "").trim() || null;
    const notes = String(body.notes ?? "").trim() || null;
    const paidAmount = n2(body.paid_amount ?? 0);
    const itemsInput = Array.isArray(body.items) ? body.items : [];

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
      (x: any) => String(x?.description ?? "").trim() !== ""
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
      return jsonError(500, {
        error: "Failed to update purchase bill",
        supabaseError: safeError(updateError),
      });
    }

    const { error: deleteItemsError } = await supabaseAdmin
      .from("purchase_bill_items")
      .delete()
      .eq("purchase_bill_id", id);

    if (deleteItemsError) {
      return jsonError(500, {
        error: "Failed to replace purchase bill items",
        supabaseError: safeError(deleteItemsError),
      });
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
      return jsonError(500, {
        error: "Failed to save purchase bill items",
        supabaseError: safeError(insertItemsError),
      });
    }

    return NextResponse.json({ ok: true, data: bill });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
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

    const { error } = await supabaseAdmin
      .from("purchase_bills")
      .delete()
      .eq("id", id);

    if (error) {
      return jsonError(500, {
        error: "Failed to delete purchase bill",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(500, {
      error: "Internal error",
      supabaseError: safeError(e),
    });
  }
}