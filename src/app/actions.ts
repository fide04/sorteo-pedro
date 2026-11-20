"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, BUCKET } from "@/lib/supabase";
import { formatDate, localDay, RAFFLE, registrationState } from "@/lib/config";
import { firstName, getPassport, getRaffleDates, storeByToken } from "@/lib/data";
import { clearParticipant, getParticipantId, setParticipant } from "@/lib/session";
import { cedulaSchema, newParticipantSchema, parseInstagramUrl, phoneSchema } from "@/lib/validation";
import type { Passport } from "@/lib/types";

type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Paso 1: ¿quién eres?  Cédula + teléfono. Si ya existe, el teléfono debe coincidir.
// ---------------------------------------------------------------------------
// Límite de intentos: 8 combinaciones cédula/teléfono equivocadas por IP en 15 minutos.
async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim().slice(0, 64);
}
async function tooManyAttempts(ip: string) {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await db().from("failed_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
  return (count ?? 0) >= 8;
}
async function recordFailure(ip: string) {
  await db().from("failed_attempts").insert({ ip });
}
const TOO_MANY = "Demasiados intentos con datos que no coinciden. Espera 15 minutos o pide ayuda al personal de la tienda.";

type Identity = { ok: true; status: "nuevo" } | { ok: true; status: "conocido"; firstName: string; id: string } | Fail;

async function identifyInternal(input: { cedula: string; phone: string }): Promise<Identity> {
  const ced = cedulaSchema.safeParse(input.cedula);
  if (!ced.success) return fail(ced.error.issues[0].message);
  const tel = phoneSchema.safeParse(input.phone);
  if (!tel.success) return fail(tel.error.issues[0].message);

  const ip = await clientIp();
  if (await tooManyAttempts(ip)) return fail(TOO_MANY);
  const { data } = await db().from("participants").select("id,full_name,phone,disqualified").eq("cedula", ced.data).maybeSingle();
  if (!data) return { ok: true, status: "nuevo" };
  if (data.phone !== tel.data) {
    await recordFailure(ip);
    return fail("Esta cédula ya está registrada con otro teléfono. Usa el mismo número de la primera vez.");
  }
  if (data.disqualified) return fail("Esta cédula no puede participar. Habla con el personal de la tienda.");
  await setParticipant(data.id);
  return { ok: true, status: "conocido", firstName: firstName(data.full_name), id: data.id };
}

export async function identify(input: { cedula: string; phone: string }) {
  const r = await identifyInternal(input);
  if (r.ok && r.status === "conocido") return { ok: true as const, status: r.status, firstName: r.firstName };
  return r as Exclude<Identity, { status: "conocido" }>;
}

// ---------------------------------------------------------------------------
// Paso 2: registro en la tienda con foto (+2) o video (+4).
// El archivo sube DIRECTO del teléfono a Supabase Storage con una URL firmada:
//   1) startCheckin  → valida todo y devuelve URLs de subida
//   2) el navegador sube el archivo (con barra de progreso)
//   3) finishCheckin → verifica que el archivo exista y guarda el registro
// ---------------------------------------------------------------------------
const MEDIA = {
  foto: { types: ["image/jpeg", "image/png", "image/webp"], max: 8 * 1024 * 1024 },
  video: { types: ["video/mp4", "video/quicktime", "video/webm"], max: 60 * 1024 * 1024 },
} as const;
type Kind = keyof typeof MEDIA;
const extFor = (t: string) => ({ "image/png": "png", "image/webp": "webp", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" })[t] ?? "jpg";

async function resolveParticipant(fd: FormData, requireInstagram = false): Promise<{ ok: true; id: string } | Fail> {
  const sb = db();
  const sessionId = await getParticipantId();
  if (sessionId) {
    const { data } = await sb.from("participants").select("id,disqualified").eq("id", sessionId).maybeSingle();
    if (data?.disqualified) return fail("Esta cédula no puede participar. Habla con el personal de la tienda.");
    if (data) return { ok: true, id: data.id };
  }
  const ced = cedulaSchema.safeParse(fd.get("cedula"));
  const tel = phoneSchema.safeParse(fd.get("phone"));
  if (!ced.success || !tel.success) return fail("Revisa tu cédula y teléfono.");

  const { data: existing } = await sb.from("participants").select("id,phone,disqualified").eq("cedula", ced.data).maybeSingle();
  if (existing) {
    if (existing.phone !== tel.data) {
      const ip = await clientIp();
      await recordFailure(ip);
      return fail((await tooManyAttempts(ip)) ? TOO_MANY : "Esta cédula ya está registrada con otro teléfono.");
    }
    if (existing.disqualified) return fail("Esta cédula no puede participar.");
    return { ok: true, id: existing.id };
  }
  const extra = newParticipantSchema.safeParse({
    fullName: fd.get("fullName") ?? "",
    instagram: fd.get("instagram") ?? "",
    acceptRules: fd.get("acceptRules") ?? undefined,
  });
  if (!extra.success) return fail(extra.error.issues[0].message);
  if (requireInstagram && !extra.data.instagram) return fail("Escribe tu usuario de Instagram: lo necesitamos para verificar tu comentario en el video del concurso.");
  const { data: created, error } = await sb
    .from("participants")
    .insert({ cedula: ced.data, phone: tel.data, full_name: extra.data.fullName, instagram: extra.data.instagram })
    .select("id")
    .single();
  if (!error) return { ok: true, id: created.id };
  const { data: again } = await sb.from("participants").select("id").eq("cedula", ced.data).single();
  return again ? { ok: true, id: again.id } : fail("No pudimos crear tu registro. Intenta de nuevo.");
}

export async function startCheckin(fd: FormData): Promise<
  { ok: true; upload: { url: string; path: string }; thumb: { url: string; path: string } | null } | Fail
> {
  const dates = await getRaffleDates();
  const state = registrationState(dates);
  if (state === "antes") return fail(`El sorteo empieza el ${formatDate(dates.startsAt)}. ¡Te esperamos!`);
  if (state === "cerrado") return fail("El sorteo ya cerró. ¡Gracias por participar!");
  if (state === "pausado") return fail("El registro está pausado por un momento. Intenta de nuevo más tarde.");
  const store = await storeByToken(String(fd.get("token") ?? ""));
  if (!store) return fail("Este código QR no es válido. Escanea el cartel de la tienda otra vez.");

  const kind = String(fd.get("kind")) as Kind;
  const type = String(fd.get("type") ?? "");
  const size = Number(fd.get("size") ?? 0);
  const spec = MEDIA[kind];
  if (!spec) return fail("Sube una foto o un video.");
  if (!(spec.types as readonly string[]).includes(type)) return fail(kind === "video" ? "El video debe ser MP4, MOV o WEBM." : "La foto debe ser JPG, PNG o WEBP.");
  if (!size || size > spec.max) return fail(kind === "video" ? "El video pesa demasiado (máximo 60 MB). Graba uno más corto." : "La foto pesa demasiado.");

  const who = await resolveParticipant(fd, !!dates.contestUrl);
  if (!who.ok) return who;
  await setParticipant(who.id);

  const sb = db();
  const day = localDay();
  const { data: dup } = await sb.from("checkins").select("id").eq("participant_id", who.id).eq("store_id", store.id).eq("day", day).maybeSingle();
  if (dup) return fail(`Ya te registraste hoy en ${store.name}. Vuelve mañana o visita otra tienda.`);

  // La ruta incluye tienda, día y participante: finishCheckin solo acepta rutas que coincidan.
  const base = `${store.slug}/${day}/${who.id}-${randomBytes(4).toString("hex")}`;
  const path = `${base}.${extFor(type)}`;
  const up = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
  if (up.error) return fail("No pudimos preparar la subida. Intenta de nuevo.");
  let thumb: { url: string; path: string } | null = null;
  if (fd.get("withThumb") === "1") {
    const t = await sb.storage.from(BUCKET).createSignedUploadUrl(`${base}-t.jpg`);
    if (!t.error) thumb = { url: t.data.signedUrl, path: `${base}-t.jpg` };
  }
  return { ok: true, upload: { url: up.data.signedUrl, path }, thumb };
}

export async function finishCheckin(input: { token: string; path: string; thumbPath: string | null; kind: Kind }): Promise<
  { ok: true; passport: Passport; checkinId: string; storeName: string; gained: number; pendingVideo: boolean } | Fail
> {
  const pid = await getParticipantId();
  if (!pid) return fail("Tu sesión expiró. Vuelve a escanear el QR.");
  {
    const d = await getRaffleDates();
    if (registrationState(d) !== "abierto") return fail("El registro no está abierto en este momento.");
  }
  const store = await storeByToken(input.token);
  if (!store) return fail("Este código QR no es válido.");
  if (!MEDIA[input.kind]) return fail("Tipo de archivo no válido.");

  const day = localDay();
  const prefix = `${store.slug}/${day}/${pid}-`;
  if (input.kind === "video" && !RAFFLE.points.video) return fail("Tipo de archivo no válido.");
  const valid = (p: string | null) => !p || (p.startsWith(prefix) && !p.includes(".."));
  if (!valid(input.path) || !input.path || !valid(input.thumbPath)) return fail("No pudimos verificar tu archivo. Intenta de nuevo.");

  const sb = db();
  // ¿El archivo realmente subió?
  const check = await sb.storage.from(BUCKET).createSignedUrl(input.path, 60);
  if (check.error) return fail("Tu archivo no terminó de subir. Revisa tu conexión e intenta otra vez.");
  let thumbPath = input.thumbPath;
  if (thumbPath && (await sb.storage.from(BUCKET).createSignedUrl(thumbPath, 60)).error) thumbPath = null;

  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { data: ins, error } = await sb
    .from("checkins")
    // Todo suma al instante. La revisión de que cumplan las reglas se hace al sortear:
    // antes de confirmar al ganador, el equipo ve todas sus fotos y videos.
    .insert({
      participant_id: pid,
      store_id: store.id,
      day,
      photo_path: input.path,
      thumb_path: thumbPath,
      media_type: input.kind,
      user_agent: ua,
    })
    .select("id")
    .single();
  if (error) {
    await sb.storage.from(BUCKET).remove(thumbPath ? [input.path, thumbPath] : [input.path]);
    if (error.code === "23505") return fail(`Ya te registraste hoy en ${store.name}.`);
    return fail("No pudimos guardar tu registro. Intenta de nuevo.");
  }
  revalidatePath("/");
  revalidatePath("/galeria");
  const passport = await getPassport(pid);
  if (!passport) return fail("Registro guardado, pero no pudimos cargar tus puntos.");
  return { ok: true, passport, checkinId: ins.id, storeName: store.name, gained: input.kind === "video" ? RAFFLE.points.video : RAFFLE.points.photo, pendingVideo: false };
}

// ---------------------------------------------------------------------------
// Bonus de Instagram: el participante pega el enlace; el equipo lo aprueba.
// ---------------------------------------------------------------------------
export async function submitPost(input: { checkinId: string; url: string }): Promise<{ ok: true } | Fail> {
  const pid = await getParticipantId();
  if (!pid) return fail("Tu sesión expiró. Entra a «Mis puntos» con tu cédula.");
  const link = parseInstagramUrl(input.url);
  if (!link) return fail("Ese no es un enlace de Instagram válido. Abre tu publicación, toca Compartir → Copiar enlace y pégalo aquí.");

  const sb = db();
  const { data: ch } = await sb.from("checkins").select("id,media_type").eq("id", input.checkinId).eq("participant_id", pid).maybeSingle();
  if (!ch) return fail("No encontramos ese registro.");
  // El enlace debe corresponder a lo que subió: foto → publicación o historia; video → reel o historia.
  if (ch.media_type === "video" && link.type === "post") return fail("Subiste un video: pega el enlace de tu Reel o de tu Historia.");
  if (ch.media_type === "foto" && link.type === "reel") return fail("Subiste una foto: pega el enlace de tu publicación o de tu Historia, no de un Reel.");

  const { data: used } = await sb.from("social_claims").select("participant_id,checkin_id").ilike("post_url", link.url).maybeSingle();
  if (used) return fail(used.checkin_id === ch.id ? "Ya enviaste este enlace." : "Ese enlace ya fue usado. Pega el de tu propia publicación.");

  const { error } = await sb.from("social_claims").insert({ participant_id: pid, checkin_id: ch.id, post_url: link.url });
  if (error?.code === "23505") return fail("Ya enviaste una publicación para esta foto o video, o ese enlace ya fue usado.");
  if (error) return fail("No pudimos enviar tu enlace. Intenta de nuevo.");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mis puntos
// ---------------------------------------------------------------------------
export async function lookup(input: { cedula: string; phone: string }): Promise<{ ok: true; passport: Passport } | Fail> {
  const r = await identifyInternal(input);
  if (!r.ok) return r;
  if (r.status === "nuevo") return fail("No encontramos esa cédula. Escanea el QR en una tienda para registrarte.");
  const passport = await getPassport(r.id);
  return passport ? { ok: true, passport } : fail("No pudimos cargar tus puntos.");
}

export async function forgetMe() {
  await clearParticipant();
}
