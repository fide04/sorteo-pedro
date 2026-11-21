import "server-only";
import { db } from "./supabase";

/**
 * Alertas de posible trampa. No castigan a nadie solas: sirven para que el equipo revise
 * con más cuidado (sobre todo al ganador antes de confirmarlo).
 */
export type Flag = { kind: "repetida" | "viaje" | "vieja" | "dispositivo"; text: string; checkinId?: string };

type Row = {
  id: string;
  participant_id: string;
  store_id: string;
  created_at: string;
  phash: string | null;
  taken_at: string | null;
  device_id: string | null;
  media_type: string;
};

const POP = Array.from({ length: 16 }, (_, i) => i.toString(2).split("1").length - 1);
/** Distancia de Hamming entre dos huellas de 64 bits en hex. */
function hamming(a: string, b: string) {
  let d = 0;
  for (let i = 0; i < 16; i++) d += POP[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return d;
}

async function allRows(): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("checkins")
      .select("id,participant_id,store_id,created_at,phash,taken_at,device_id,media_type")
      .neq("status", "rechazado")
      .order("created_at")
      .range(from, from + 999);
    if (error) throw error;
    out.push(...(data as Row[]));
    if (data.length < 1000) return out;
  }
}

/** Alertas por participante. */
export async function fraudFlags(): Promise<Map<string, Flag[]>> {
  const sb = db();
  const [rows, { data: people }, { data: stores }] = await Promise.all([
    allRows(),
    sb.from("participants").select("id,full_name,device_id"),
    sb.from("stores").select("id,name"),
  ]);
  const name = new Map((people ?? []).map((p) => [p.id, p.full_name as string]));
  const storeName = new Map((stores ?? []).map((s) => [s.id, (s.name as string).replace(/^CC\s+/i, "")]));
  const flags = new Map<string, Flag[]>();
  const add = (pid: string, f: Flag) => {
    const list = flags.get(pid) ?? [];
    if (!list.some((x) => x.text === f.text)) list.push(f);
    flags.set(pid, list);
  };

  // 1) Foto o video repetido / copiado (huella visual casi igual)
  const hashed = rows.filter((r) => r.phash);
  for (let i = 0; i < hashed.length; i++)
    for (let j = i + 1; j < hashed.length; j++) {
      const a = hashed[i], b = hashed[j];
      if (hamming(a.phash!, b.phash!) > 5) continue;
      if (a.participant_id === b.participant_id) {
        add(a.participant_id, { kind: "repetida", text: `Usó la misma foto en ${storeName.get(a.store_id)} y ${storeName.get(b.store_id)}`, checkinId: b.id });
      } else {
        add(b.participant_id, { kind: "repetida", text: `Su foto en ${storeName.get(b.store_id)} es igual a una de ${name.get(a.participant_id)} (subida antes)`, checkinId: b.id });
        add(a.participant_id, { kind: "repetida", text: `${name.get(b.participant_id)} subió una foto igual a la suya`, checkinId: a.id });
      }
    }

  // 2) Viaje imposible: dos tiendas distintas con menos de 20 minutos de diferencia
  const byPerson = new Map<string, Row[]>();
  for (const r of rows) byPerson.set(r.participant_id, [...(byPerson.get(r.participant_id) ?? []), r]);
  for (const [pid, list] of byPerson)
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1], cur = list[i];
      const min = (Date.parse(cur.created_at) - Date.parse(prev.created_at)) / 60000;
      if (cur.store_id !== prev.store_id && min < 20)
        add(pid, {
          kind: "viaje",
          text: `Pasó de ${storeName.get(prev.store_id)} a ${storeName.get(cur.store_id)} en ${Math.max(0, Math.round(min))} min (¿escaneó el QR desde otro lugar?)`,
          checkinId: cur.id,
        });
    }

  // 3) Foto vieja: el archivo es de horas antes de subirlo (no se tomó en la tienda en ese momento)
  for (const r of rows) {
    if (!r.taken_at) continue;
    const h = (Date.parse(r.created_at) - Date.parse(r.taken_at)) / 3600000;
    if (h > 3) add(r.participant_id, { kind: "vieja", text: `${r.media_type === "video" ? "Video" : "Foto"} en ${storeName.get(r.store_id)} tomado ${h > 48 ? `${Math.round(h / 24)} días` : `${Math.round(h)} horas`} antes de subirlo`, checkinId: r.id });
  }

  // 4) Varias cédulas desde el mismo teléfono
  const byDevice = new Map<string, Set<string>>();
  for (const r of rows) if (r.device_id) byDevice.set(r.device_id, (byDevice.get(r.device_id) ?? new Set()).add(r.participant_id));
  for (const p of people ?? []) if (p.device_id) byDevice.set(p.device_id, (byDevice.get(p.device_id) ?? new Set()).add(p.id));
  for (const ids of byDevice.values()) {
    if (ids.size < 2) continue;
    for (const pid of ids) {
      const others = [...ids].filter((x) => x !== pid).map((x) => name.get(x)).filter(Boolean);
      add(pid, { kind: "dispositivo", text: `Mismo teléfono que: ${others.join(", ")}` });
    }
  }
  return flags;
}
