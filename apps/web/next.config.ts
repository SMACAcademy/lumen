import path from "node:path";
import type { NextConfig } from "next";

/**
 * Where the site lives. GitHub Pages serves a project site under the repo's
 * name (https://smacacademy.github.io/lumen/), so the Pages workflow sets
 * NEXT_PUBLIC_BASE_PATH=/lumen; locally it is empty and the site is at /.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Every page is prerendered, so the build is plain files in `out/`: any
  // static host serves it, with no server and no database.
  output: "export",
  basePath,
  // Each page becomes a folder with an index.html, which static hosts serve
  // for both /play/x and /play/x/.
  trailingSlash: true,
  // Workspace packages ship TypeScript source; Next compiles them.
  transpilePackages: [
    "@ise/chemistry-engine",
    "@ise/concept-schema",
    "@ise/content",
    "@ise/game-engine",
    "@ise/graph-engine",
    "@ise/mathematics-engine",
    "@ise/physics-engine",
    "@ise/progress-store",
    "@ise/science-engine",
    "@ise/simulation-renderer",
    "@ise/units",
  ],
  turbopack: {
    root: path.resolve(process.cwd(), "../.."),
  },
};

export default nextConfig;
