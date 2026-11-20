import Link from "next/link";
import { Ban, Download, RotateCcw, Search } from "lucide-react";
import { setDisqualified } from "../actions";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { allRanked } from "@/lib/data";
import { localDay } from "@/lib/config";
import { db } from "@/lib/supabase";

export default async function Ranking({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [all, today] = await Promise.all([
    allRanked(),
    db().from("checkins").select("id", { count: "exact", head: true }).eq("day", localDay()),
  ]);
  const valid = all.filter((p) => !p.disqualified);
  const totalPoints = valid.reduce((a, p) => a + p.points, 0);
  const completed = valid.filter((p) => p.stores_total > 0 && p.stores_visited >= p.stores_total).length;

  const needle = q.trim().toLowerCase();
  const rows = (needle ? all.filter((p) => p.cedula.includes(needle) || p.full_name.toLowerCase().includes(needle) || p.phone.includes(needle)) : all).slice(0, 200);

  const stats = [
    { label: "Participantes", value: valid.length },
    { label: "Registros hoy", value: today.count ?? 0 },
    { label: "Puntos en juego", value: totalPoints },
    { label: "Completaron todas", value: completed },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardDescription>{s.label}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 text-3xl font-bold tabular-nums">{s.value.toLocaleString("es-VE")}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Ranking</CardTitle>
            <CardDescription>Cada punto es un boleto en el sorteo. Mostrando {rows.length} de {all.length}.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <form className="flex gap-2">
              <Input name="q" defaultValue={q} placeholder="Cédula, nombre o teléfono" className="h-9 w-56" />
              <Button size="sm" variant="outline" className="h-9" aria-label="Buscar">
                <Search />
              </Button>
            </form>
            <Button asChild size="sm" variant="secondary" className="h-9">
              <a href="/admin/export">
                <Download /> CSV
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">#</TableHead>
                <TableHead>Participante</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead className="text-center">Tiendas</TableHead>
                <TableHead className="text-center">IG</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p, i) => (
                <TableRow key={p.id} className={p.disqualified ? "opacity-50" : ""}>
                  <TableCell className="text-muted-foreground pl-5 tabular-nums">{needle ? "" : i + 1}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{p.full_name}</div>
                    {p.instagram && (
                      <a className="text-secondary text-xs" href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer">
                        @{p.instagram}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{p.cedula}</TableCell>
                  <TableCell>
                    <a className="hover:underline" href={`https://wa.me/${p.phone}`} target="_blank" rel="noreferrer">
                      +{p.phone}
                    </a>
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    {p.stores_visited}/{p.stores_total}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{p.posts}</TableCell>
                  <TableCell className="text-right">
                    {p.disqualified ? <Badge variant="destructive">Anulado</Badge> : <span className="text-lg font-bold tabular-nums">{p.points}</span>}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      action={setDisqualified.bind(null, p.id, !p.disqualified)}
                      confirm={p.disqualified ? undefined : `¿Anular a ${p.full_name}? No participará en el sorteo.`}
                      aria-label={p.disqualified ? "Reactivar" : "Anular"}
                    >
                      {p.disqualified ? <RotateCcw /> : <Ban />}
                    </ActionButton>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    {needle ? (
                      <>
                        Sin resultados. <Link href="/admin" className="text-secondary underline">Ver todos</Link>
                      </>
                    ) : (
                      "Todavía no hay participantes."
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
