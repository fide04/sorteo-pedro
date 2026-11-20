import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { RAFFLE, SITE_URL } from "@/lib/config";
import "./globals.css";

// Archivo variable (peso 100-900, ancho 62-125 %), auto-alojada.
const archivo = localFont({
  src: "../fonts/Archivo.woff2",
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: { type: "website", locale: "es_VE", siteName: RAFFLE.brand },
  title: `Sorteo ${RAFFLE.prize} gratis | ${RAFFLE.brand}`,
  description: `Escanea el QR en cada tienda ${RAFFLE.brand}, sube tu foto y suma puntos para ganar ${RAFFLE.prize}. Totalmente gratis.`,
};

export const viewport: Viewport = { themeColor: "#1a237e", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className={`${archivo.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
