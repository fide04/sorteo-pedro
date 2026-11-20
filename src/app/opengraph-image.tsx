import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { RAFFLE } from "@/lib/config";

// Vista previa al compartir el link (WhatsApp, Instagram, Facebook, X)
export const alt = `Sorteo gratis de ${RAFFLE.prize} | ${RAFFLE.brand}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const [black, bold] = await Promise.all([
    readFile(join(process.cwd(), "src/fonts/Archivo-Black.woff")),
    readFile(join(process.cwd(), "src/fonts/Archivo-Bold.woff")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "white",
          fontFamily: "Archivo",
          background: "linear-gradient(180deg, #1b0833 0%, #3a0f6b 35%, #6b1fa8 60%, #c2268f 82%, #ff8a3d 100%)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", left: 780, top: 330, width: 520, height: 520, borderRadius: 9999, background: "linear-gradient(180deg,#ffd25a,#ff8a3d 55%,#ff2e88)", display: "flex" }} />
        <div style={{ position: "absolute", left: 0, bottom: 0, width: 1200, height: 90, background: "linear-gradient(180deg,#14d4c4,#0a5d78)", display: "flex" }} />
        <div style={{ fontSize: 34, fontWeight: 700, display: "flex" }}>
          TechnoCell <span style={{ color: "#14d4c4", marginLeft: 12 }}>2015</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 900, lineHeight: 1, letterSpacing: -2, display: "flex" }}>Sorteamos un</div>
          <div style={{ fontSize: 150, fontWeight: 900, lineHeight: 1, color: "#ffd25a", letterSpacing: -4, display: "flex" }}>{RAFFLE.prize}</div>
          <div style={{ fontSize: 36, fontWeight: 700, marginTop: 18, display: "flex", maxWidth: 700 }}>Gratis. Escanea el QR en la tienda y sube tu foto o video.</div>
        </div>
        <div style={{ height: 60, display: "flex" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: black, weight: 900, style: "normal" },
        { name: "Archivo", data: bold, weight: 700, style: "normal" },
      ],
    },
  );
}
