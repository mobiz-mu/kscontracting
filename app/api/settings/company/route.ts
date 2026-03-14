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
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

async function ensureSettingsRow() {
  const admin = createSupabaseAdminClient();

  const { data: existing, error: findErr } = await admin
    .from("company_settings")
    .select("*")
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findErr) {
    throw findErr;
  }

  if (existing) return existing;

  const { data: inserted, error: insertErr } = await admin
    .from("company_settings")
    .insert({
      company_name: "KS CONTRACTING LTD",
      currency: "MUR",
      vat_rate: 0.15,
      invoice_prefix: "INV",
      quote_prefix: "QTN",
      credit_prefix: "CN",
      next_invoice_no: 1,
      next_quote_no: 1,
      next_credit_no: 1,
      pdf_footer_note:
        "Thank you for your business. Please use the invoice number as payment reference.",
    })
    .select("*")
    .single();

  if (insertErr) throw insertErr;

  return inserted;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    const row = await ensureSettingsRow();

    return NextResponse.json({
      ok: true,
      data: row,
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Failed to load company settings",
      supabaseError: safeError(e),
    });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    const body = await req.json().catch(() => ({}));
    const admin = createSupabaseAdminClient();

    const existing = await ensureSettingsRow();

    const vatRatePercent = n2(body?.vat_rate);
    const vatRateDecimal =
      vatRatePercent > 1 ? vatRatePercent / 100 : vatRatePercent;

    const payload = {
      company_name: String(body?.company_name ?? "").trim() || "KS CONTRACTING LTD",
      brn: body?.brn ? String(body.brn).trim() : null,
      vat_no: body?.vat_no ? String(body.vat_no).trim() : null,
      address: body?.address ? String(body.address).trim() : null,
      phone: body?.phone ? String(body.phone).trim() : null,
      email: body?.email ? String(body.email).trim() : null,
      currency: String(body?.currency ?? "MUR").trim().toUpperCase() || "MUR",
      vat_rate: vatRateDecimal > 0 ? vatRateDecimal : 0.15,
      invoice_prefix: String(body?.invoice_prefix ?? "INV").trim() || "INV",
      quote_prefix: String(body?.quote_prefix ?? "QTN").trim() || "QTN",
      credit_prefix: String(body?.credit_prefix ?? "CN").trim() || "CN",
      next_invoice_no: Math.max(1, Math.floor(n2(body?.next_invoice_no) || 1)),
      next_quote_no: Math.max(1, Math.floor(n2(body?.next_quote_no) || 1)),
      next_credit_no: Math.max(1, Math.floor(n2(body?.next_credit_no) || 1)),
      pdf_footer_note: body?.pdf_footer_note
        ? String(body.pdf_footer_note).trim()
        : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await admin
      .from("company_settings")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      return jsonError(500, {
        error: "Failed to save company settings",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (e: any) {
    return jsonError(500, {
      error: "Failed to save company settings",
      supabaseError: safeError(e),
    });
  }
}