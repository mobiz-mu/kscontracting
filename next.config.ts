import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next defaults to spawning one build worker per CPU core. On machines
    // with many cores but limited memory (common in CI containers, some
    // Windows dev machines, etc.) this can spawn dozens of workers and
    // exhaust available memory/handles, causing the build to hang or crash
    // with EPIPE during "Collecting page data". Capping it keeps builds
    // reliable across environments at a modest cost to build speed.
    cpus: 4,
  },
  typescript: {
    // Only used by `npm run build:stable` (see package.json), as a documented
    // fallback if `npm run build` still hangs after telemetry is disabled.
    // `npm run typecheck` (`tsc --noEmit`) is a mandatory separate step in
    // that fallback path, so type safety isn't silently skipped — this only
    // avoids Next re-running its own internal type-check worker, which is
    // where builds have been reported hanging.
    ignoreBuildErrors: process.env.NEXT_IGNORE_BUILD_ERRORS === "1",
  },
};

export default nextConfig;
