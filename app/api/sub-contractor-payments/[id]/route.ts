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

    const { data, error } = await supabaseAdmin
      .from("sub_contractor_payments")
      .select(`
        *,
        sub_contractors (
          id,
          name,
          brn,
          vat_no,
          phone,
          email
        ),
        purchase_bills (
          id,
          bill_no,
          bill_date,
          total_amount,
          balance_amount
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return jsonError(404, {
        error: "Sub contractor payment not found",
        supabaseError: safeError(error),
      });
    }

    return NextResponse.json({ ok: true, data });
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
      .from("sub_contractor_payments")
      .delete()
      .eq("id", id);

    if (error) {
      return jsonError(500, {
        error: "Failed to delete payment",
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