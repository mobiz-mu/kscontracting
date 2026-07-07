import { NextResponse } from "next/server";
import { getCurrentAuthz } from "@/lib/authz";

export const runtime = "nodejs";

function jsonError(status: number, payload: Record<string, unknown>) {
  return NextResponse.json({ ok: false, ...payload }, { status });
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";

    if (msg === "Unauthorized") {
      return jsonError(401, { error: "Unauthorized" });
    }

    console.error("[auth/me/permissions]", e);
    return jsonError(500, { error: "Failed to load current permissions" });
  }
}