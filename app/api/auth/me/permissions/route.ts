import { NextResponse } from "next/server";
import { getCurrentAuthz } from "@/lib/authz";

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
    const authz = await getCurrentAuthz();

    return NextResponse.json({
      ok: true,
      data: {
        userId: authz.userId,
        roleKeys: authz.roleKeys,
        permissions: authz.permissions,
      },
    });
  } catch (e: any) {
    const msg = String(e?.message ?? "");

    if (msg === "Unauthorized") {
      return jsonError(401, { error: "Unauthorized" });
    }

    return jsonError(500, {
      error: "Failed to load current permissions",
      supabaseError: safeError(e),
    });
  }
}