import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // El panel y los enlaces de cada tienda (QR) no deben aparecer en Google
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/t/"] } };
}
