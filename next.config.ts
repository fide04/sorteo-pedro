import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Las fotos se comprimen en el teléfono (~300-700 KB); dejamos margen.
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
};

export default nextConfig;
