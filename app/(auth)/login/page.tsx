"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { signInWithEmail } from "./actions";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await signInWithEmail(formData);

    setLoading(false);

    if (!res.ok) {
      setError(res.error || "Login failed");
      return;
    }

    router.refresh();
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_10px_50px_rgba(15,23,42,0.10)] lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left premium panel */}
          <div className="relative hidden overflow-hidden bg-[linear-gradient(180deg,#071b38_0%,#0b2347_100%)] p-10 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(700px_320px_at_0%_0%,rgba(255,122,24,0.22),transparent_55%),radial-gradient(520px_260px_at_100%_100%,rgba(255,255,255,0.08),transparent_55%)]" />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
                    <Image
                      src="/kslogo.png"
                      alt="KS Contracting"
                      width={72}
                      height={72}
                      className="object-contain"
                      priority
                    />
                  </div>

                  <div>
                    <div className="text-xl font-extrabold tracking-tight">
                      KS Accounting
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      KS CONTRACTING LTD
                    </div>
                  </div>
                </div>

                <div className="mt-14 max-w-md">
                  <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 backdrop-blur">
                    Premium Business Suite
                  </div>

                  <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight">
                    Welcome back to your business dashboard
                  </h1>

                  <p className="mt-4 text-sm leading-7 text-white/75">
                    Manage invoices, quotations, credit notes, VAT reports,
                    customers, suppliers, and live business performance in one
                    premium workspace.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Invoices</div>
                  <div className="mt-1 text-lg font-extrabold">Live</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Reports</div>
                  <div className="mt-1 text-lg font-extrabold">VAT Ready</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Dashboard</div>
                  <div className="mt-1 text-lg font-extrabold">Real Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right login box */}
          <div className="flex items-center justify-center bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center lg:text-left">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200 lg:mx-0">
                  <Image
                    src="/kslogo.png"
                    alt="KS Logo"
                    width={42}
                    height={42}
                    className="object-contain"
                    priority
                  />
                </div>

                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Sign in
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Access your KS Contracting business workspace
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_6px_30px_rgba(15,23,42,0.06)] sm:p-7">
                <form onSubmit={onSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        name="email"
                        type="email"
                        defaultValue="admin@kscontracting.mu"
                        placeholder="Enter your email"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
                      />
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff7a18] px-4 text-sm font-bold text-white transition hover:bg-[#ff6a00] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </button>

                  <div className="flex items-center justify-between gap-3 pt-1 text-xs text-slate-500">
                    <Link
                      href="/register"
                      className="font-semibold text-slate-600 transition hover:text-[#ff7a18]"
                    >
                      Register
                    </Link>
                    <Link
                      href="/forgot-password"
                      className="font-semibold text-slate-600 transition hover:text-[#ff7a18]"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </form>
              </div>

              <div className="mt-6 text-center text-xs text-slate-400 lg:text-left">
                © {new Date().getFullYear()} KS CONTRACTING LTD
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}