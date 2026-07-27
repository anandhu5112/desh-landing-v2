import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Emit a plain static site to out/ for Cloudflare Workers static assets.
  // Every route in this app prerenders, so nothing is lost by exporting.
  output: "export",
  images: {
    // Static export has no Node server, so the default Image Optimization
    // loader is unavailable. Images are served as-authored instead — fine
    // here, since the AMC logos are already sized for their display slot.
    unoptimized: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
