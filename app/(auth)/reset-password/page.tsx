"use client";

import Image from "next/image";
import Link from "next/link";
import * as React from "react";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";

export default function ResetPasswordPage() {
  const [loading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // TODO: connect your real reset-password action here
      await new Promise((resolve) => setTimeout(resolve, 900));

      setSuccess("Your password has been updated successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      setError(e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
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
                    Secure Access
                  </div>

                  <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight">
                    Create your new password securely
                  </h1>

                  <p className="mt-4 text-sm leading-7 text-white/75">
                    Update your password to regain access to your premium KS
                    Contracting business workspace.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Security</div>
                  <div className="mt-1 text-lg font-extrabold">Protected</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Access</div>
                  <div className="mt-1 text-lg font-extrabold">Restored</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-xs text-white/60">Workspace</div>
                  <div className="mt-1 text-lg font-extrabold">Ready</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right reset box */}
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
                  Reset password
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Enter your new password below
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_6px_30px_rgba(15,23,42,0.06)] sm:p-7">
                <form onSubmit={onSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      New password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        required
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Confirm new password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
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

                  {success ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {success}
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
                        Updating...
                      </>
                    ) : (
                      "Update password"
                    )}
                  </button>

                  <div className="pt-1">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-[#ff7a18]"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to login
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