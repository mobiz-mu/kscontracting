import { redirect } from "next/navigation";

// Canonical public invoice viewer lives at /public-invoice/[token] (with
// proper expired/revoked/not-found states and dynamic company branding).
// This route is kept only so old links/bookmarks to /share/invoice/[token]
// don't 404 — nothing in the app generates links here anymore (see
// app/api/invoices/[id]/share-link/route.ts, which only ever builds
// /public-invoice/[token] URLs).
export default async function ShareInvoiceRedirectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/public-invoice/${token}`);
}
