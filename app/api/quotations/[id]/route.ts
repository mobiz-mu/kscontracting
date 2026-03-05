// app/api/quotations/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id } = await params;

  // your logic...
  return NextResponse.json({ ok: true, id });
}