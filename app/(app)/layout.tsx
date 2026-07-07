import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// This layout wraps every protected page and performs a live network call
// to Supabase Auth on every render. It must never be statically evaluated
// or prerendered at build time — explicit here rather than relying on
// Next's implicit "uses cookies() => dynamic" detection, which has been
// inconsistent across versions and is a likely contributor to build-time
// hangs when this layout gets evaluated for many pages during "Collecting
// page data".
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getUserWithTimeout(
  supabase: ReturnType<typeof createServerClient>,
  timeoutMs = 8000
) {
  return Promise.race([
    supabase.auth.getUser(),
    new Promise<{ data: { user: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { user: null } }), timeoutMs)
    ),
  ]);
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    }
  );

  // Never let a slow/unreachable auth backend hang page rendering (or,
  // worse, a build-time evaluation of this layout) indefinitely.
  const {
    data: { user },
  } = await getUserWithTimeout(supabase);

  if (!user) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}