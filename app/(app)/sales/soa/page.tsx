import { redirect } from "next/navigation";

// Canonical route is /reports/soa. Kept for old links/bookmarks.
export default function SalesSoaRedirectPage() {
  redirect("/reports/soa");
}
