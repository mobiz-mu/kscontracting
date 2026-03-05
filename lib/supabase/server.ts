// lib/supabase/server.ts
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required.`);
  return v;
}

/**
 * Server client with cookies (uses the logged-in user session).
 * RLS applies.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("NEXT_PUBLIC_SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Admin client (service role). Use ONLY in server routes.
 * Bypasses RLS.
 */
export function createSupabaseAdminClient() {
  // You must add SUPABASE_SERVICE_ROLE_KEY in .env.local
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}