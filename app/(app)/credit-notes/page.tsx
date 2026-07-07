import { redirect } from "next/navigation";

// Canonical route is /sales/credit-notes. Kept for old links/bookmarks.
export default function CreditNotesRedirectPage() {
  redirect("/sales/credit-notes");
}
