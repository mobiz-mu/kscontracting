import { redirect } from "next/navigation";

// Canonical route is /sales/invoices. Kept for old links/bookmarks.
export default function InvoicesRedirectPage() {
  redirect("/sales/invoices");
}
