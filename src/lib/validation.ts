import { z } from "zod";

const digits = (s: string) => s.replace(/\D/g, "");

export const cedulaSchema = z
  .string()
  .transform((s) => digits(s.replace(/^[VvEe]-?/, "")))
  .pipe(z.string().regex(/^[0-9]{6,9}$/, "La cédula debe tener entre 6 y 9 números"));

/** Acepta 0414-1234567, +58 414 1234567, 4141234567 → 584141234567 */
export const phoneSchema = z
  .string()
  .transform((s) => {
    let d = digits(s);
    if (d.startsWith("0")) d = "58" + d.slice(1);
    if (d.length === 10) d = "58" + d;
    return d;
  })
  .pipe(z.string().regex(/^[0-9]{10,13}$/, "Escribe un teléfono válido, por ejemplo 0414-1234567"));

export const instagramSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""))
  .pipe(z.string().regex(/^[A-Za-z0-9._]{0,30}$/, "Usuario de Instagram no válido"))
  .transform((s) => s || null);

export const newParticipantSchema = z.object({
  fullName: z.string().trim().min(3, "Escribe tu nombre y apellido").max(80),
  instagram: instagramSchema.optional().default(""),
  acceptRules: z.literal("on", { message: "Debes aceptar las reglas para participar" }),
});

/** Normaliza y clasifica un enlace de Instagram: publicación, reel o historia. */
export function parseInstagramUrl(raw: string): { url: string; type: "post" | "reel" | "story" } | null {
  const s = raw.trim().replace(/^(?!https?:\/\/)/i, "https://");
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (!/^(www\.|m\.)?instagram\.com$/i.test(u.hostname)) return null;
  const parts = u.pathname.split("/").filter(Boolean);
  // instagram.com/p/ID, /reel/ID, /reels/ID, /stories/usuario/ID, y también /usuario/p/ID
  const i = parts.findIndex((p) => ["p", "reel", "reels", "stories"].includes(p.toLowerCase()));
  if (i < 0) return null;
  const kind = parts[i].toLowerCase();
  if (kind === "stories") {
    const [user, id] = [parts[i + 1], parts[i + 2]];
    if (!user || !/^\d+$/.test(id ?? "")) return null;
    return { url: `https://www.instagram.com/stories/${user}/${id}/`, type: "story" };
  }
  const id = parts[i + 1];
  if (!id || !/^[A-Za-z0-9_-]{5,}$/.test(id)) return null;
  // /p/ID y /reel/ID son la misma publicación: guardamos siempre /p/ID para que no se pueda reutilizar
  // un enlace ajeno cambiando solo el tipo. El tipo detectado sirve para validar foto vs. video.
  return { url: `https://www.instagram.com/p/${id}/`, type: kind === "p" ? "post" : "reel" };
}

export const postUrlSchema = z
  .string()
  .trim()
  .transform((s) => (/^https?:\/\//i.test(s) ? s : "https://" + s).replace(/^http:/i, "https:"))
  .pipe(z.string().url("Pega el enlace completo de tu publicación")
  .regex(/^https:\/\/(www\.)?instagram\.com\/(p|reel|stories)\//i, "Debe ser un enlace de una publicación de Instagram"));
