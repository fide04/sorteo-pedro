import Link from "next/link";
import { Bars, Columns } from "@/components/admin/charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TZ } from "@/lib/config";
import { getStats } from "@/lib/stats";

export const metadata = { title: "Estadísticas | Sorteo TechnoCell" };

const n = (v: number) => v.toLocaleString("es-VE");

export default async function Estadisticas() {
  const s = await getStats();
  const k = s.kpis;
  const top = s.storeRows[0];
  const ago = new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const tiles = [
    { label: "Participantes", value: n(k.participantes) },
    { label: "Registros en tiendas", value: n(k.registros), sub: `${n(k.fotos)} fotos · ${n(k.videos)} videos` },
    { label: "Registros hoy", value: n(k.hoy) },
    { label: "Completaron las tiendas", value: n(k.completaron), sub: k.participantes ? `${Math.round((k.completaron / k.participantes) * 100)} % de los participantes` : undefined },
    { label: "Tiendas por persona", value: k.promedioTiendas.toFixed(1), sub: "promedio" },
    { label: "Publicaciones de Instagram", value: n(k.postsAprobados), sub: k.postsPendientes ? `${n(k.postsPendientes)} por revisar` : "aprobadas" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {tiles.map((t) => (
          <Card key={t.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardDescription>{t.label}</CardDescription>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-3xl font-bold tabular-nums">{t.value}</p>
              {t.sub && <p className="text-muted-foreground text-xs">{t.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Tiendas con más registros</CardTitle>
            <CardDescription>
              {top && top.total > 0 ? `${top.name} va primero con ${n(top.total)} registros.` : "Todavía no hay registros."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Bars data={s.storeRows.map((r) => ({ key: r.id, label: r.name.replace(/^CC\s+/i, ""), value: r.total }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registros por día</CardTitle>
            <CardDescription>Fotos y videos subidos cada día en todas las tiendas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Columns data={s.days} every={Math.ceil(s.days.length / 8)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Horas con más movimiento</CardTitle>
            <CardDescription>{s.peak ? `La hora pico es de ${s.peak} (hora de las tiendas).` : "Aún sin datos."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Columns data={s.hours} every={2} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>¿Cuántas tiendas visitó cada persona?</CardTitle>
            <CardDescription>Número de personas según las tiendas distintas que visitaron.</CardDescription>
          </CardHeader>
          <CardContent>
            <Columns data={s.dist.map((d) => ({ ...d, label: `${d.label} ${d.label === "1" ? "tienda" : "tiendas"}` }))} unit="personas" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por tienda</CardTitle>
          <CardDescription>Toca una tienda para ver sus fotos y videos.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">#</TableHead>
                <TableHead>Tienda</TableHead>
                <TableHead className="text-right">Registros</TableHead>
                <TableHead className="text-right">Personas</TableHead>
                <TableHead className="text-right">Fotos</TableHead>
                <TableHead className="text-right">Videos</TableHead>
                <TableHead className="text-right">Hoy</TableHead>
                <TableHead className="pr-5 text-right">Último registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.storeRows.map((r, i) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground pl-5">{i + 1}</TableCell>
                  <TableCell>
                    <Link href={`/admin/registros?tienda=${r.id}`} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                    {r.city && <span className="text-muted-foreground ml-2 text-xs">{r.city}</span>}
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">{n(r.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(r.personas)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(r.fotos)}</TableCell>
                  <TableCell className="text-right tabular-nums">{n(r.videos)}</TableCell>
                  <TableCell className="text-right">{r.hoy ? <Badge variant="success">{n(r.hoy)}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                  <TableCell className="text-muted-foreground pr-5 text-right text-sm">{r.ultimo ? ago.format(new Date(r.ultimo)) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
