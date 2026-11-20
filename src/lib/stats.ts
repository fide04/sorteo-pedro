import "server-only";
import { allRanked, activeStores, getClosesAt } from "./data";
import { db } from "./supabase";
import { localDay, TZ } from "./config";

type Row = { id: string; store_id: string; participant_id: string; media_type: "foto" | "video"; status: string; day: string; created_at: string };

async function allCheckins(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("checkins")
      .select("id,store_id,participant_id,media_type,status,day,created_at")
      .neq("status", "rechazado")
      .order("created_at")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data as Row[]));
    if (data.length < 1000) return out;
  }
}

const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hourCycle: "h23" });

export async function getStats() {
  const sb = db();
  const [rows, stores, ranked, closesAt, posts] = await Promise.all([
    allCheckins(),
    activeStores(),
    allRanked(),
    getClosesAt(),
    sb.from("social_claims").select("status"),
  ]);
  const today = localDay();
  const people = ranked.filter((p) => !p.disqualified);

  // Por tienda
  const storeRows = stores
    .map((s) => {
      const r = rows.filter((x) => x.store_id === s.id);
      return {
        id: s.id,
        name: s.name,
        city: s.city,
        total: r.length,
        fotos: r.filter((x) => x.media_type === "foto").length,
        videos: r.filter((x) => x.media_type === "video").length,
        personas: new Set(r.map((x) => x.participant_id)).size,
        hoy: r.filter((x) => x.day === today).length,
        ultimo: r.at(-1)?.created_at ?? null,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Por día: desde el primer registro (o hoy) hasta hoy / cierre
  const firstDay = rows[0]?.day ?? today;
  const lastDay = today < closesAt ? today : closesAt;
  const days: { label: string; value: number; key: string }[] = [];
  for (let d = new Date(firstDay + "T12:00:00Z"); d.toISOString().slice(0, 10) <= lastDay && days.length < 60; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: new Intl.DateTimeFormat("es-VE", { timeZone: "UTC", day: "numeric", month: "short" }).format(d).replace(".", ""),
      value: rows.filter((x) => x.day === key).length,
    });
  }

  // Por hora del día (hora local de las tiendas)
  const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, value: 0, key: String(h) }));
  for (const x of rows) hours[Number(hourFmt.format(new Date(x.created_at))) % 24].value++;
  const firstActive = hours.findIndex((h) => h.value > 0);
  const lastActive = 23 - [...hours].reverse().findIndex((h) => h.value > 0);
  const hoursShown = firstActive < 0 ? hours.slice(8, 22) : hours.slice(Math.min(firstActive, 8), Math.max(lastActive, 21) + 1);
  const peak = hours.reduce((a, b) => (b.value > a.value ? b : a), hours[0]);

  // Cuántas tiendas visitó cada persona
  const n = stores.length;
  const dist = Array.from({ length: n }, (_, i) => ({
    label: `${i + 1}`,
    key: String(i + 1),
    value: people.filter((p) => p.stores_visited === i + 1).length,
  }));

  const claims = posts.data ?? [];
  return {
    kpis: {
      participantes: people.length,
      registros: rows.length,
      fotos: rows.filter((x) => x.media_type === "foto").length,
      videos: rows.filter((x) => x.media_type === "video").length,
      hoy: rows.filter((x) => x.day === today).length,
      completaron: people.filter((p) => n > 0 && p.stores_visited >= n).length,
      promedioTiendas: people.length ? people.reduce((a, p) => a + p.stores_visited, 0) / people.length : 0,
      postsAprobados: claims.filter((c) => c.status === "aprobado").length,
      postsPendientes: claims.filter((c) => c.status === "pendiente").length,
      puntos: people.reduce((a, p) => a + p.points, 0),
    },
    storeRows,
    days,
    hours: hoursShown,
    peak: peak.value ? `${peak.label.replace("h", "")}:00 a ${(Number(peak.key) + 1) % 24}:00` : null,
    dist,
  };
}
