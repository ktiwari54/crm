import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server build for small Docker runtime images.
  output: "standalone",
  // Trace workspace deps from the monorepo root so standalone bundles them.
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
