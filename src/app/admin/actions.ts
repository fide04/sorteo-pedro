"use server";

import { randomBytes, randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { allRanked, getClosesAt } from "@/lib/data";
import { formatDate, localDay, raffleClosed } from "@/lib/config";
import { adminAccounts, checkLogin, currentAdmin, endSession, requireAdmin, startSession } from "@/lib/session";
import { BUCKET, db } from "@/lib/supabase";
import type { ReviewStatus } from "@/lib/types";

// ---------- sesión ----------
// Máximo 5 claves equivocadas por conexión cada 15 minutos.
async function adminIp() {
  const h = await headers();
  return "admin:" + (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim().slice(0, 64);
}

export async function login(_: unknown, fd: FormData) {
  const pw = String(fd.get("password") ?? "");
  const user = String(fd.get("user") ?? "");
  const ip = await adminIp();
  const sb = db();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await sb.from("failed_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).gte("created_at", since);
  if ((count ?? 0) >= 5) return { error: "Demasiados intentos. Espera 15 minutos." };
  await new Promise((r) => setTimeout(r, 600)); // frena ataques de fuerza bruta
  if (!adminAccounts().length)
    return { error: "El panel no tiene cuentas configuradas. Revisa ADMIN_ACCOUNTS en Vercel y vuelve a publicar (Redeploy)." };
  const who = checkLogin(user, pw);
  if (!who) {
    await sb.from("failed_attempts").insert({ ip });
    const left = 4 - (count ?? 0);
    return { error: left > 0 ? `Usuario o clave incorrectos. Te quedan ${left} intentos.` : "Demasiados intentos. Espera 15 minutos." };
  }
  await startSession(who);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ---------- moderación ----------
const status = z.enum(["aprobado", "pendiente", "rechazado"]);
const uuid = z.string().uuid();

export async function setCheckinStatus(id: string, s: ReviewStatus) {
  await requireAdmin();
  await db().from("checkins").update({ status: status.parse(s) }).eq("id", uuid.parse(id));
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/galeria");
}

/** El video está bien pero no cumple como "video creativo": vale como foto (+2). */
export async function approveAsPhoto(id: string) {
  await requireAdmin();
  await db().from("checkins").update({ status: "aprobado", media_type: "foto" }).eq("id", uuid.parse(id));
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/galeria");
}

export async function setClaimStatus(id: string, s: ReviewStatus) {
  await requireAdmin();
  await db().from("social_claims").update({ status: status.parse(s) }).eq("id", uuid.parse(id));
  revalidatePath("/admin", "layout");
}

export async function setDisqualified(id: string, value: boolean) {
  await requireAdmin();
  await db().from("participants").update({ disqualified: value }).eq("id", uuid.parse(id));
  revalidatePath("/admin", "layout");
}

// ---------- borrar ----------
async function removeFiles(paths: (string | null)[]) {
  const list = paths.filter((p): p is string => !!p);
  for (let i = 0; i < list.length; i += 100) await db().storage.from(BUCKET).remove(list.slice(i, i + 100));
}

/** Borra una foto o video (y su archivo). Resta sus puntos. No se puede deshacer. */
export async function deleteCheckin(id: string) {
  await requireAdmin();
  const sb = db();
  const { data } = await sb.from("checkins").select("photo_path,thumb_path").eq("id", uuid.parse(id)).maybeSingle();
  if (!data) return;
  await sb.from("checkins").delete().eq("id", id);
  await removeFiles([data.photo_path, data.thumb_path]);
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/galeria");
}

/**
 * Borra a un participante para siempre: sus datos, fotos, videos y enlaces de Instagram.
 * Si ya salió en un sorteo no se borra (el historial debe quedar completo): en ese caso, anúlalo.
 */
export async function deleteParticipant(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = db();
  const pid = uuid.parse(id);
  const { count } = await sb.from("draws").select("id", { count: "exact", head: true }).eq("participant_id", pid);
  if (count) return { ok: false, error: "Esta persona aparece en el historial de sorteos. No se puede borrar; puedes anularla." };
  const { data: files } = await sb.from("checkins").select("photo_path,thumb_path").eq("participant_id", pid);
  const { error } = await sb.from("participants").delete().eq("id", pid); // borra en cascada registros y publicaciones
  if (error) return { ok: false, error: "No se pudo borrar. Intenta de nuevo." };
  await removeFiles((files ?? []).flatMap((f) => [f.photo_path, f.thumb_path]));
  revalidatePath("/admin", "layout");
  revalidatePath("/");
  revalidatePath("/galeria");
  return { ok: true };
}

// ---------- sorteo ----------
export type WinnerMedia = { id: string; store: string; day: string; kind: "foto" | "video"; url: string; status: string };
export type DrawResult =
  | {
      ok: true;
      drawId: string;
      name: string;
      cedula: string;
      phone: string;
      instagram: string | null;
      points: number;
      total: number;
      chance: number;
      people: number;
      media: WinnerMedia[];
    }
  | { ok: false; error: string };

/** Todas las fotos y videos de un participante, con URLs firmadas, para verificar que cumplió. */
async function participantMedia(participantId: string): Promise<WinnerMedia[]> {
  const sb = db();
  const { data } = await sb
    .from("checkins")
    .select("id,day,photo_path,media_type,status,stores(name)")
    .eq("participant_id", participantId)
    .order("created_at")
    .returns<{ id: string; day: string; photo_path: string; media_type: "foto" | "video"; status: string; stores: { name: string } | null }[]>();
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: signed } = await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.photo_path), 60 * 60 * 6);
  return rows.map((r, i) => ({ id: r.id, store: r.stores?.name ?? "", day: r.day, kind: r.media_type, status: r.status, url: signed?.[i]?.signedUrl ?? "" }));
}

export async function confirmDraw(drawId: string) {
  await requireAdmin();
  const { data: d } = await db().from("draws").select("note").eq("id", uuid.parse(drawId)).single();
  await db()
    .from("draws")
    .update({ status: "confirmado", note: `${d?.note ?? ""} · confirmado por ${await currentAdmin()}`.replace(/^ · /, "") })
    .eq("id", uuid.parse(drawId));
  revalidatePath("/admin", "layout");
}

/** El ganador no cumplió: se anula el sorteo y se descalifica para poder sortear de nuevo. */
export async function voidDraw(drawId: string) {
  await requireAdmin();
  const sb = db();
  const { data: d } = await sb.from("draws").select("note").eq("id", uuid.parse(drawId)).single();
  const { data } = await sb
    .from("draws")
    .update({ status: "anulado", note: `${d?.note ?? ""} · anulado por ${await currentAdmin()}`.replace(/^ · /, "") })
    .eq("id", uuid.parse(drawId))
    .select("participant_id")
    .single();
  if (data) await sb.from("participants").update({ disqualified: true }).eq("id", data.participant_id);
  revalidatePath("/admin", "layout");
  revalidatePath("/");
}

/** Sorteo ponderado: cada punto = 1 boleto. Usa crypto.randomInt (aleatorio criptográfico) y queda registrado. */
export async function runDraw(excludePrevious: boolean): Promise<DrawResult> {
  await requireAdmin();
  const closesAt = await getClosesAt();
  if (!raffleClosed(closesAt)) return { ok: false, error: `El sorteo sigue abierto hasta el ${formatDate(closesAt)}. Podrás sortear cuando cierre.` };
  const sb = db();
  let pool = (await allRanked()).filter((p) => p.points > 0 && !p.disqualified);
  if (excludePrevious) {
    const { data } = await sb.from("draws").select("participant_id").neq("status", "anulado");
    const prev = new Set((data ?? []).map((d) => d.participant_id));
    pool = pool.filter((p) => !prev.has(p.id));
  }
  const total = pool.reduce((a, p) => a + p.points, 0);
  if (!total) return { ok: false, error: "No hay participantes con puntos." };

  let ticket = randomInt(total);
  const winner = pool.find((p) => (ticket -= p.points) < 0)!;
  const { data: draw } = await sb
    .from("draws")
    .insert({
      participant_id: winner.id,
      winner_points: winner.points,
      total_points: total,
      total_participants: pool.length,
      note: `Sorteado por ${await currentAdmin()}`,
    })
    .select("id")
    .single();
  revalidatePath("/admin", "layout");
  return {
    ok: true,
    drawId: draw?.id ?? "",
    media: await participantMedia(winner.id),
    name: winner.full_name,
    cedula: winner.cedula,
    phone: winner.phone,
    instagram: winner.instagram,
    points: winner.points,
    total,
    chance: winner.points / total,
    people: pool.length,
  };
}

// ---------- fecha de cierre ----------
export async function setClosesAt(_: unknown, fd: FormData) {
  await requireAdmin();
  const v = String(fd.get("closesAt") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return { error: "Elige una fecha válida.", ok: false };
  const { error } = await db().from("settings").upsert({ key: "closes_at", value: v, updated_at: new Date().toISOString() });
  if (error) return { error: "No se pudo guardar la fecha.", ok: false };
  revalidatePath("/", "layout");
  return {
    error: "",
    ok: true,
    note: v < localDay() ? "Ojo: esa fecha ya pasó, así que el sorteo queda cerrado desde ahora." : "",
  };
}

// ---------- tiendas ----------
const storeSchema = z.object({
  name: z.string().trim().min(3).max(60),
  city: z.string().trim().max(40).optional(),
});

export async function createStore(_: unknown, fd: FormData) {
  await requireAdmin();
  const p = storeSchema.safeParse({ name: fd.get("name"), city: fd.get("city") || undefined });
  if (!p.success) return { error: "Escribe un nombre de tienda válido." };
  const slug =
    p.data.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^cc\s+/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "tienda";
  const { error } = await db().from("stores").insert({ name: p.data.name, city: p.data.city ?? null, slug: `${slug}-${randomBytes(2).toString("hex")}` });
  if (error) return { error: "No se pudo crear la tienda." };
  revalidatePath("/admin", "layout");
  return { error: "" };
}

export async function toggleStore(id: string, active: boolean) {
  await requireAdmin();
  await db().from("stores").update({ active }).eq("id", uuid.parse(id));
  revalidatePath("/admin", "layout");
}

/** Cambia el código del QR: los carteles viejos dejan de funcionar (útil si alguien lo filtró). */
export async function rotateToken(id: string) {
  await requireAdmin();
  await db().from("stores").update({ qr_token: randomBytes(9).toString("hex") }).eq("id", uuid.parse(id));
  revalidatePath("/admin", "layout");
}
