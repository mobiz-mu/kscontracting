/**
 * Admin utility: reset a Supabase user's password.
 *
 * Usage:
 *   node scripts/reset-user-password.js --user-id <uuid> --password <new-password>
 *
 * Required environment variables (loaded from .env.local if present, but
 * never hard-code real values into this file or commit them):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script never contains real credentials. If this repository was ever
 * shared/zipped with a populated .env.local, rotate the Supabase service
 * role key and any affected user passwords immediately.
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--user-id") args.userId = argv[++i];
    else if (argv[i] === "--password") args.password = argv[++i];
    else if (argv[i] === "--email") args.email = argv[++i];
  }
  return args;
}

function prompt(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }
    // Minimal masked input for password prompts.
    const stdin = process.stdin;
    process.stdout.write(question);
    let input = "";
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (char) => {
      char = char.toString();
      if (char === "\n" || char === "\r" || char === "\u0004") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        rl.close();
        resolve(input);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f") {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in your environment or .env.local."
    );
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let userId = args.userId;
  if (!userId && args.email) {
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error("Failed to look up user by email:", error.message);
      process.exit(1);
    }
    const match = data.users.find((u) => u.email?.toLowerCase() === args.email.toLowerCase());
    if (!match) {
      console.error("No user found with that email.");
      process.exit(1);
    }
    userId = match.id;
  }
  if (!userId) {
    userId = await prompt("User ID (uuid): ");
  }

  const password = args.password || (await prompt("New password: ", { hidden: true }));
  if (!password || password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const { data, error } = await supabase.auth.admin.updateUserById(userId, { password });

  if (error) {
    console.error("Failed to update password:", error.message);
    process.exit(1);
  }

  console.log("Password updated for user:", data.user?.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
