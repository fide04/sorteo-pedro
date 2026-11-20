import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos se comprimen en el teléfono (~300-700 KB); dejamos margen.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  poweredByHeader: false,
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "geolocation=(), microphone=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: [...base, { key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      // El panel nunca se puede incrustar en otra página ni guardarse en caché
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
