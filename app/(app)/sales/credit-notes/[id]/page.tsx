"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function getParamId(params: unknown): string {
  const p = params as any;
  const raw = p?.id;
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return String(raw ?? "").trim();
}

function isValidId(id: string) {
  if (!id) return false;
  if (id === "undefined" || id === "null") return false;
  return true;
}

export default function Page() {
  const params = useParams();
  const router = useRouter();
  const id = getParamId(params);
  const hasId = isValidId(id);

  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string>("");

  async function load() {
    if (!hasId) {
      setErr("Missing credit note id");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      // Placeholder until you add /api/credit-notes/[id]
      await new Promise((r) => setTimeout(r, 200));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load credit note");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={() => router.push("/sales/credit-notes")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>

          <Button
            variant="outline"
            className="h-10 rounded-2xl"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        <div className="text-sm text-slate-600">
          {hasId ? (
            <>
              Credit Note ID: <span className="font-semibold text-slate-900">{id}</span>
            </>
          ) : (
            <span className="text-rose-700 font-semibold">Missing credit note id</span>
          )}
        </div>
      </div>

      {err ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {err}
        </div>
      ) : null}

      <div className="rounded-3xl bg-white ring-1 ring-slate-200 p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Credit Note (Details)
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This is a minimal placeholder page so the build passes. Next step is wiring the real data endpoint and UI.
        </p>

        <div className="mt-4 text-sm">
          <Link className="text-blue-700 underline" href="/sales/credit-notes">
            Go to Credit Notes list
          </Link>
        </div>
      </div>
    </div>
  );
}