import { NextRequest, NextResponse } from "next/server";
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

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();

    if (userErr || !userRes.user) {
      return jsonError(401, {
        error: "Unauthorized",
        supabaseError: safeError(userErr),
      });
    }

    const admin = createSupabaseAdminClient();
    const days = Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 30) || 30);

    const { data, error } = await admin
      .from("invoices")
      .select(`
        id,
        invoice_no,
        customer_name,
        invoice_date,
        due_date,
        status,
        total_amount,
        paid_amount,
        balance_amount,
        created_by
      `)
      .eq("created_by", userRes.user.id)
      .in("status", ["ISSUED", "PARTIALLY_PAID"])
      .gt("balance_amount", 0)
      .order("due_date", { ascending: true });

    if (error) {
      return jsonError(500, {
        error: "Failed to load overdue invoices",
        supabaseError: safeError(error),
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = (data ?? []).filter((row: any) => {
      const due = parseDateOnly(row.due_date);
      if (!due) return false;

      const diffMs = today.getTime() - due.getTime();
      const diffDays = Math.floor(diffMs / 86400000);

      return diffDays >= days && n2(row.balance_amount) > 0;
    });

    return NextResponse.json({
      ok: true,
      data: overdue,
      meta: {
        total: overdue.length,
        days,
      },
    });
  } catch (e: any) {
    return jsonError(500, {
      error: e?.message ?? "Internal error",
    });
  }
}