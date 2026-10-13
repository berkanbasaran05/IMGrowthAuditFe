import type { NextConfig } from "next";
const backend = process.env.BACKEND_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${backend}/api/:path*` },
        { source: "/sunum/:slug", destination: `${backend}/sunum/:slug` },
        { source: "/demo/:path*", destination: `${backend}/demo/:path*` }
      ],
      afterFiles: [],
      fallback: []
    };
  }
};

export default nextConfig;
