import { NextResponse } from "next/server";
import {
  createSupabaseServerClient,
  createSupabaseAdminClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function isDraftStatus(v: any) {
  return String(v ?? "").trim().toUpperCase() === "DRAFT";
}

export async function GET(_req: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const safeId = String(id ?? "").trim();

  if (!safeId) return jsonError(400, { error: "Missing invoice id" });
  if (!isUuid(safeId)) return jsonError(400, { error: "Invalid invoice id" });

  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: uErr } = await supabase.auth.getUser();

    if (uErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(uErr),
      });
    }

    const admin = createSupabaseAdminClient();

    const { data: invoice, error: invErr } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_no,
        invoice_type,
        status,
        invoice_date,
        site_address,
        notes,
        subtotal,
        vat_amount,
        total_amount,
        paid_amount,
        balance_amount,
        created_at,
        issued_at,
        customer_id,
        created_by,
        customer_name,
        customer_vat,
        customer_brn,
        customer_address
      `)
      .eq("id", safeId)
      .eq("created_by", userRes.user.id)
      .maybeSingle();

    if (invErr) {
      return jsonError(500, {
        error: "Failed to load invoice",
        supabaseError: safeError(invErr),
      });
    }

    if (!invoice) {
      return jsonError(404, { error: "Invoice not found" });
    }

    let customer: any = null;

    if (invoice.customer_id != null) {
      const { data: cust, error: custErr } = await admin
        .from("customers")
        .select("id, name, brn, vat_no, address")
        .eq("id", invoice.customer_id)
        .maybeSingle();

      if (custErr) {
        return jsonError(500, {
          error: "Failed to load customer",
          supabaseError: safeError(custErr),
        });
      }

      customer = cust ?? null;
    }

    const { data: items, error: itemsErr } = await admin
      .from("invoice_items")
      .select(
        "id, invoice_id, description, qty, unit_price_excl_vat, vat_rate, vat_amount, line_total"
      )
      .eq("invoice_id", safeId)
      .order("id", { ascending: true });

    if (itemsErr) {
      return jsonError(500, {
        error: "Failed to load invoice items",
        supabaseError: safeError(itemsErr),
      });
    }

    const statusKey = String(invoice.status ?? "").toUpperCase();
    const canEditDraft = isDraftStatus(statusKey);
    const canIssue = isDraftStatus(statusKey);

    return NextResponse.json(
      {
        ok: true,
        data: {
          invoice: {
            id: invoice.id,
            invoice_no: invoice.invoice_no,
            invoice_type: invoice.invoice_type,
            status: invoice.status,
            invoice_date: invoice.invoice_date,
            site_address: invoice.site_address,
            notes: invoice.notes,
            subtotal: invoice.subtotal ?? 0,
            vat_amount: invoice.vat_amount ?? 0,
            total_amount: invoice.total_amount ?? 0,
            paid_amount: invoice.paid_amount ?? 0,
            balance_amount: invoice.balance_amount ?? 0,
            created_at: invoice.created_at,
            issued_at: invoice.issued_at,
            customer_id: invoice.customer_id,
            created_by: invoice.created_by,

            customer_name: (invoice as any).customer_name ?? customer?.name ?? null,
            customer_address:
              (invoice as any).customer_address ?? customer?.address ?? null,
            customer_brn: (invoice as any).customer_brn ?? customer?.brn ?? null,
            customer_vat: (invoice as any).customer_vat ?? customer?.vat_no ?? null,

            can_edit_draft: canEditDraft,
            can_issue: canIssue,

            customers: customer,
          },
          items: (items ?? []).map((item: any) => ({
            id: item.id,
            invoice_id: item.invoice_id,
            description: item.description ?? "",
            qty: Number(item.qty ?? 0),
            unit_price_excl_vat: Number(item.unit_price_excl_vat ?? 0),
            vat_rate: Number(item.vat_rate ?? 0.15),
            vat_amount: Number(item.vat_amount ?? 0),
            line_total: Number(item.line_total ?? 0),

            price: Number(item.unit_price_excl_vat ?? 0),
            total: Number(item.line_total ?? 0),
          })),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    return jsonError(500, {
      error: "Unexpected server error",
      supabaseError: safeError(err),
    });
  }
}