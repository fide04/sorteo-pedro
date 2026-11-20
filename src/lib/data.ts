import "server-only";
import { db } from "./supabase";
import { RAFFLE } from "./config";
import { BUCKET } from "./supabase";
import type { GalleryItem, Passport, ParticipantPoints, PublicStore, RankRow, Store } from "./types";

/** Fecha de cierre vigente: la del panel si existe, si no la de config.ts. */
export async function getClosesAt(): Promise<string> {
  const { data } = await db().from("settings").select("value").eq("key", "closes_at").maybeSingle();
  return data?.value && /^\d{4}-\d{2}-\d{2}$/.test(data.value) ? data.value : RAFFLE.closesAt;
}

export async function activeStores(): Promise<PublicStore[]> {
  const { data, error } = await db().from("stores").select("id,name,city").eq("active", true).order("created_at");
  if (error) throw error;
  return data;
}

export async function storeByToken(token: string): Promise<Store | null> {
  if (!/^[a-f0-9]{8,64}$/.test(token)) return null;
  const { data } = await db().from("stores").select("*").eq("qr_token", token).eq("active", true).maybeSingle();
  return data;
}

export async function participantName(id: string) {
  const { data } = await db().from("participants").select("full_name").eq("id", id).maybeSingle();
  return data ? firstName(data.full_name) : null;
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0];

/** "Ana María Pérez" → "Ana P." (en lo público nunca mostramos el nombre completo, cédula ni teléfono) */
export function publicName(full: string) {
  const parts = full.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

export async function getPassport(participantId: string): Promise<Passport | null> {
  const sb = db();
  const [pts, stores, checks, claims] = await Promise.all([
    sb.from("participant_points").select("*").eq("id", participantId).maybeSingle<ParticipantPoints>(),
    activeStores(),
    sb.from("checkins").select("id,store_id,day,status,media_type,created_at").eq("participant_id", participantId).neq("status", "rechazado").order("created_at", { ascending: false }),
    sb.from("social_claims").select("checkin_id,status").eq("participant_id", participantId),
  ]);
  if (!pts.data) return null;
  const rows = checks.data ?? [];
  const claimed = new Set((claims.data ?? []).map((c) => c.checkin_id));
  return {
    firstName: firstName(pts.data.full_name),
    points: pts.data.points,
    storesTotal: stores.length,
    posts: pts.data.posts,
    pendingPosts: (claims.data ?? []).filter((c) => c.status === "pendiente").length,
    pendingVideos: rows.filter((r) => r.status === "pendiente" && r.media_type === "video").length,
    stores: stores.map((s) => {
      const approved = rows.find((r) => r.store_id === s.id && r.status === "aprobado");
      const last = approved ?? rows.find((r) => r.store_id === s.id);
      return { id: s.id, name: s.name, visited: !!approved, pending: !approved && !!last, lastDay: last?.day ?? null };
    }),
    lastCheckinId: rows.find((r) => !claimed.has(r.id))?.id ?? null,
  };
}

/** Supabase devuelve como máximo 1000 filas por consulta: paginamos. */
export async function allRanked(): Promise<ParticipantPoints[]> {
  const out: ParticipantPoints[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("participant_points")
      .select("*")
      .order("points", { ascending: false })
      .order("created_at")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data as ParticipantPoints[]));
    if (data.length < 1000) return out;
  }
}

type GalleryRow = {
  id: string;
  day: string;
  photo_path: string;
  thumb_path: string | null;
  media_type: "foto" | "video";
  participant_id: string;
  participants: { full_name: string; disqualified: boolean } | null;
  stores: { name: string } | null;
};

/** Galería pública: fotos aprobadas, más recientes primero, con URLs firmadas (1 h). */
export async function publicGallery(limit = 24, offset = 0): Promise<GalleryItem[]> {
  const sb = db();
  const { data } = await sb
    .from("checkins")
    .select("id,day,photo_path,thumb_path,media_type,participant_id,participants!inner(full_name,disqualified),stores(name)")
    .eq("status", "aprobado")
    .eq("participants.disqualified", false)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)
    .returns<GalleryRow[]>();
  const rows = data ?? [];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.participant_id))];
  const videos = rows.filter((r) => r.media_type === "video");
  const [{ data: pts }, { data: signed }, { data: vsigned }] = await Promise.all([
    sb.from("participant_points").select("id,points").in("id", ids),
    sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.thumb_path ?? r.photo_path), 60 * 60),
    videos.length ? sb.storage.from(BUCKET).createSignedUrls(videos.map((r) => r.photo_path), 60 * 60) : Promise.resolve({ data: [] }),
  ]);
  const videoUrl = new Map((vsigned ?? []).map((v, i) => [videos[i].id, v.signedUrl ?? ""]));
  const points = new Map((pts ?? []).map((p) => [p.id, p.points as number]));
  return rows
    .map((r, i) => ({
      id: r.id,
      kind: r.media_type,
      video: videoUrl.get(r.id),
      name: publicName(r.participants?.full_name ?? ""),
      store: r.stores?.name ?? "",
      day: r.day,
      points: points.get(r.participant_id) ?? 0,
      // en videos sin miniatura, la "src" sería el propio video: no la usamos como imagen
      src: r.media_type === "video" && !r.thumb_path ? "" : (signed?.[i]?.signedUrl ?? ""),
    }))
    .filter((g) => g.src || g.video);
}

/** Tabla de puntos pública. */
export async function publicRanking(limit = 10): Promise<RankRow[]> {
  const { data } = await db()
    .from("participant_points")
    .select("full_name,points,stores_visited,stores_total")
    .eq("disqualified", false)
    .gt("points", 0)
    .order("points", { ascending: false })
    .order("created_at")
    .limit(limit);
  return (data ?? []).map((p) => ({ name: publicName(p.full_name), points: p.points, stores: p.stores_visited, storesTotal: p.stores_total }));
}

/** Último ganador confirmado (para anunciarlo en la portada). */
export async function publicWinner(): Promise<{ name: string; points: number } | null> {
  const { data } = await db()
    .from("draws")
    .select("winner_points,participants(full_name)")
    .eq("status", "confirmado")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ winner_points: number; participants: { full_name: string } | null }>();
  return data?.participants ? { name: publicName(data.participants.full_name), points: data.winner_points } : null;
}
