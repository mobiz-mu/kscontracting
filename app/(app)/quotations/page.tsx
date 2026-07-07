import { redirect } from "next/navigation";

// Canonical route is /sales/quotations. Kept for old links/bookmarks.
export default function QuotationsRedirectPage() {
  redirect("/sales/quotations");
}
