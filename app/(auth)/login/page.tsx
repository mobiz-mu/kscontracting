// app/(auth)/login/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
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

    // Important: refresh so middleware/session cookies are applied
    router.refresh();
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/kslogo.png"
            alt="KS Logo"
            width={42}
            height={42}
            className="rounded-xl"
            priority
          />
          <div>
            <div className="text-lg font-semibold">KS Accounting</div>
            <div className="text-xs text-white/60">KS CONTRACTING LTD</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur">
          <h1 className="text-xl font-semibold">Sign in</h1>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <input
              name="email"
              type="email"
              defaultValue="admin@kscontracting.mu"
              placeholder="Email"
              required
              className="h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]"
            />

            <input
              name="password"
              type="password"
              placeholder="Password"
              required
              className="h-11 w-full rounded-xl border border-white/20 bg-white/10 px-3 text-sm outline-none focus:ring-2 focus:ring-[#ff7a18]"
            />

            {error && <div className="text-sm text-red-400">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#ff7a18] py-3 font-semibold hover:bg-[#ff6a00] transition disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex justify-between text-xs text-white/60">
              <Link href="/register">Register</Link>
              <Link href="/forgot-password">Forgot password?</Link>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-white/50">
          © {new Date().getFullYear()} KS CONTRACTING LTD
        </div>
      </div>
    </div>
  );
}