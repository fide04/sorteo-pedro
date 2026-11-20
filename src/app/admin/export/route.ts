import { allRanked } from "@/lib/data";
import { isAdmin } from "@/lib/session";
import { localDay } from "@/lib/config";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  const s = String(v ?? "");
  // Comillas + evita inyección de fórmulas en Excel
  return `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"`;
};

export async function GET() {
  if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });
  const rows = await allRanked();
  const head = ["posicion", "nombre", "cedula", "telefono", "instagram", "registros", "tiendas", "publicaciones", "puntos", "anulado", "fecha_registro"];
  const body = rows.map((p, i) =>
    [i + 1, p.full_name, p.cedula, p.phone, p.instagram, p.checkins, p.stores_visited, p.posts, p.points, p.disqualified ? "si" : "no", p.created_at].map(cell).join(","),
  );
  return new Response("﻿" + [head.join(","), ...body].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sorteo-ranking-${localDay()}.csv"`,
    },
  });
}
