import type { NextConfig } from "next";
const backend = process.env.BACKEND_URL || "http://localhost:3001";

const prod = process.env.NODE_ENV === "production";

// Tüm sayfalarda güvenlik başlıkları. Panel ve portal başka sitelerde çerçeve içine alınamaz.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ...(prod ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  // Docker imajı için bağımsız çıktı (BUILD_STANDALONE=1). Üretim derlemesi ayrı klasöre alınabilir (NEXT_DIST_DIR),
  // böylece çalışan geliştirme sunucusunun .next önbelleği bozulmaz.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // CRM yönetim paneline taşındı; eski adres yönlendirilir.
  async redirects() {
    return [{ source: "/crm", destination: "/yonetim/musteriler", permanent: false }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${backend}/api/:path*` },
        { source: "/sunum/:slug", destination: `${backend}/sunum/:slug` },
        { source: "/demo/:path*", destination: `${backend}/demo/:path*` },
        { source: "/r/:path*", destination: `${backend}/r/:path*` },
        { source: "/oauth/:path*", destination: `${backend}/oauth/:path*` },
        { source: "/odeme/:path*", destination: `${backend}/odeme/:path*` },
        { source: "/odeme-sonuc", destination: `${backend}/odeme-sonuc` }
      ],
      afterFiles: [],
      fallback: []
    };
  }
};

export default nextConfig;
