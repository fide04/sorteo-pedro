// ---- CONFIGURACIÓN DEL SORTEO: edita aquí ----
export const RAFFLE = {
  brand: "TechnoCell 2015",
  prize: "GTA 6",
  instagram: "technocell2015", // sin @
  hashtag: "#SorteoTechnoCell",
  closesAt: "2026-11-27", // fecha de cierre por defecto; se cambia desde el panel (Sorteo → Fecha de cierre)
  points: { photo: 2, video: 4, allStoresBonus: 10, post: 2 },
  maxVideoSeconds: 30,
} as const;
// ----------------------------------------------

export const TZ = process.env.RAFFLE_TZ || "America/Caracas";
// Dirección pública del sitio (la usan los QR). En Vercel se detecta sola si no la defines.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "http://localhost:3000"
).replace(/\/$/, "");

/** Día local (YYYY-MM-DD) en la zona horaria del sorteo. */
export function localDay(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** El último día para participar es `closesAt` (inclusive). Cierra al terminar ese día en RAFFLE_TZ. */
export function raffleClosed(closesAt: string, now = new Date()) {
  return localDay(now) > closesAt;
}

export function formatDate(d: string | Date) {
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00Z") : new Date(d);
  return new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "long" }).format(date);
}

export function formatShortDate(d: string) {
  return new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(d + "T12:00:00Z")).replace(".", "");
}
