# ⚠️ Immediate action required

The ZIP you provided contained a populated `.env.local` file and a script
(`scripts/reset-user-password.js`) with a real user ID and a plaintext
password hard-coded in it. Both are now considered **compromised** because
they left your control (uploaded in a ZIP).

Do this now, before anything else:

1. **Rotate the Supabase service role key** for this project
   (Project Settings → API → reset service role key), and update it
   everywhere it's used (hosting provider env vars, local `.env.local`).
2. **Rotate the Supabase anon key** as a precaution if you're not sure who
   had access to the ZIP.
3. **Change the password** for the user account referenced in the old
   `scripts/reset-user-password.js` (user id ending in `...74461ba4`), since
   that plaintext password is no longer secret.
4. Going forward, never commit or zip `.env.local`. Use `.env.example`
   (included in this project) as the template, and keep real values only in
   your local `.env.local` / hosting provider's secret manager.
5. `.env.local` is already listed in `.gitignore`, so it wasn't committed to
   git history — but it was in the ZIP itself, so treat all values in it as
   exposed regardless of git status.

This file is a one-time reminder — delete it once you've rotated the keys.
