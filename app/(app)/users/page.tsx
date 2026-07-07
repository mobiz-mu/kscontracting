import { redirect } from "next/navigation";

// The canonical Users management page now lives at /settings/users.
// This route is kept only so old links/bookmarks to /users don't 404.
export default function UsersRedirectPage() {
  redirect("/settings/users");
}
