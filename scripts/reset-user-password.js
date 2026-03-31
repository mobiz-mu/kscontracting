const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    const value = m[2];
    if (!process.env[key]) process.env[key] = value;
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const uid = "edb301d4-802d-49d2-8029-e6d774461ba4";
  const password = "accounts@kscontracting";

  const { data, error } = await supabase.auth.admin.updateUserById(uid, {
    password,
  });

  if (error) {
    console.error("Failed:", error);
    process.exit(1);
  }

  console.log("Password updated for user:", data.user?.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
