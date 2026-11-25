import type { NextConfig } from "next";

// The template enabled cacheComponents, which forces cookie-reading components into
// Suspense. All pages here are per user, so there is nothing to prerender; left off.
const nextConfig: NextConfig = {
  // self-contained server for the Docker image (.next/standalone)
  output: "standalone",

  agentRules: false,

  // pin the project root; Next can pick up a stray lockfile in a parent folder
  turbopack: { root: import.meta.dirname },
};

export default nextConfig;
