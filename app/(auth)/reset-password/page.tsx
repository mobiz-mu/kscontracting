"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getErrorMessage } from "@/lib/utils";

type PageStatus = "checking" | "ready" | "invalid" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = React.useState<PageStatus>("checking");
  const [loading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");

  // The password-reset email links back here with a recovery token in the
  // URL. Supabase's client SDK exchanges that for a real session and fires
  // a PASSWORD_RECOVERY auth event; only once that happens do we allow the
  // person to set a new password.
  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStatus("ready");
      }
    });

    // If a session already exists when this page loads (e.g. the recovery
    // redirect already ran before this effect attached its listener),
    // allow the reset to proceed too.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setStatus((prev) => (prev === "checking" ? "ready" : prev));
      } else {
        // Give the recovery-link exchange a moment to complete before
        // deciding there's no valid session.
        setTimeout(() => {
          setStatus((prev) => (prev === "checking" ? "invalid" : prev));
        }, 2500);
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateErr } = await supabase.auth.updateUser({ password });

      if (updateErr) {
        throw updateErr;
      }

      setStatus("success");
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Failed to reset password."));
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
                  {status === "invalid"
                    ? "This reset link is invalid or has expired"
                    : "Enter your new password below"}
                </p>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_6px_30px_rgba(15,23,42,0.06)] sm:p-7">
                {status === "checking" ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-sm text-slate-500">
                    <Loader2 className="size-5 animate-spin text-slate-400" />
                    Verifying your reset link...
                  </div>
                ) : status === "invalid" ? (
                  <div className="space-y-5 text-center">
                    <p className="text-sm text-slate-600">
                      This password reset link is no longer valid. Request a
                      new one to continue.
                    </p>
                    <Link
                      href="/forgot-password"
                      className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[#ff7a18] px-4 text-sm font-bold text-white transition hover:bg-[#ff6a00]"
                    >
                      Request a new link
                    </Link>
                    <Link
                      href="/login"
                      className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-[#ff7a18]"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to login
                    </Link>
                  </div>
                ) : status === "success" ? (
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                      <CheckCircle2 className="size-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900">
                        Password updated
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        Redirecting you to login...
                      </p>
                    </div>
                  </div>
                ) : (
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
                          minLength={8}
                          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#ff7a18] focus:ring-4 focus:ring-[#ff7a18]/10"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-400">
                        At least 8 characters.
                      </p>
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
                          minLength={8}
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
                )}
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
