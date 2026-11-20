// ---- CONFIGURACIÓN DEL SORTEO: edita aquí ----
export const RAFFLE = {
  brand: "TechnoCell 2015",
  prize: "GTA 6",
  instagram: "technocell2015", // sin @
  hashtag: "#SorteoTechnoCell",
  // Valores por defecto: se cambian desde el panel (Sorteo → Fechas y video del concurso)
  startsAt: "2026-11-21", // primer día para participar
  closesAt: "2026-12-03", // último día para participar
  announceAt: "2026-12-04", // día en que se anuncia al ganador
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

/** Aún no empieza: hoy es antes de `startsAt`. */
export function raffleNotStarted(startsAt: string, now = new Date()) {
  return localDay(now) < startsAt;
}

export type QrMode = "auto" | "open" | "paused";
export type RaffleDates = { startsAt: string; closesAt: string; announceAt: string; contestUrl: string | null; qrMode: QrMode };

/**
 * Estado efectivo del registro por QR:
 *  - "auto": según fechas (antes / abierto / cerrado)
 *  - "open": abierto ya, sin importar las fechas (pruebas o apertura anticipada)
 *  - "paused": nadie puede registrarse
 */
export function registrationState(d: RaffleDates): "abierto" | "antes" | "cerrado" | "pausado" {
  if (d.qrMode === "paused") return "pausado";
  if (d.qrMode === "open") return "abierto";
  if (raffleNotStarted(d.startsAt)) return "antes";
  if (raffleClosed(d.closesAt)) return "cerrado";
  return "abierto";
}

/** Días que faltan para una fecha (0 = hoy). */
export function daysUntil(day: string) {
  return Math.round((Date.parse(day) - Date.parse(localDay())) / 86400000);
}

export function formatDate(d: string | Date) {
  const date = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00Z") : new Date(d);
  return new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "long" }).format(date);
}

export function formatShortDate(d: string) {
  return new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short" }).format(new Date(d + "T12:00:00Z")).replace(".", "");
}
