import { confirmDraw, voidDraw } from "../../actions";
import { ActionButton } from "@/components/admin/action-button";
import { DrawPanel } from "@/components/admin/draw-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClosingForm } from "@/components/admin/closing-form";
import { allRanked, getClosesAt } from "@/lib/data";
import { formatDate, localDay, raffleClosed, TZ } from "@/lib/config";
import { db } from "@/lib/supabase";

type Draw = { id: string; status: string; note: string | null; created_at: string; winner_points: number; total_points: number; total_participants: number; participants: { full_name: string; cedula: string } | null };

export default async function Sorteo() {
  const [ranked, closesAt] = await Promise.all([allRanked(), getClosesAt()]);
  const pool = ranked.filter((p) => p.points > 0 && !p.disqualified);
  const closed = raffleClosed(closesAt);
  const daysLeft = Math.round((Date.parse(closesAt) - Date.parse(localDay())) / 86400000) + 1;
  const { data } = await db()
    .from("draws")
    .select("id,status,note,created_at,winner_points,total_points,total_participants,participants(full_name,cedula)")
    .order("created_at", { ascending: false })
    .returns<Draw[]>();
  const fmt = new Intl.DateTimeFormat("es-VE", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Fecha de cierre</CardTitle>
          <CardDescription>
            {closed
              ? `El sorteo cerró el ${formatDate(closesAt)}. Los QR ya no aceptan fotos ni videos.`
              : `Abierto hasta el ${formatDate(closesAt)} inclusive (${daysLeft === 1 ? "hoy es el último día" : `quedan ${daysLeft} días`}). Al pasar esa fecha los QR dejan de aceptar registros y se habilita el sorteo.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClosingForm closesAt={closesAt} />
        </CardContent>
      </Card>
      <DrawPanel people={pool.length} tickets={pool.reduce((a, p) => a + p.points, 0)} closed={closed} closesLabel={formatDate(closesAt)} />
      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Cada sorteo queda guardado con los boletos que había en ese momento, para transparencia.</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Fecha</TableHead>
                <TableHead>Ganador</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead className="text-right">Sus puntos</TableHead>
                <TableHead>Boletos totales</TableHead>
                <TableHead className="pr-5 text-right">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="pl-5">
                    {fmt.format(new Date(d.created_at))}
                    {d.note && <div className="text-muted-foreground text-xs">{d.note}</div>}
                  </TableCell>
                  <TableCell className="font-semibold">{d.participants?.full_name}</TableCell>
                  <TableCell className="tabular-nums">{d.participants?.cedula}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.winner_points}</TableCell>
                  <TableCell className="tabular-nums">
                    {d.total_points} ({d.total_participants} personas)
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {d.status === "por_verificar" ? (
                      <span className="inline-flex gap-1.5">
                        <ActionButton size="sm" variant="success" action={confirmDraw.bind(null, d.id)} done="Ganador confirmado">
                          Confirmar
                        </ActionButton>
                        <ActionButton size="sm" variant="outline" action={voidDraw.bind(null, d.id)} confirm="¿Anular este ganador y descalificarlo?">
                          Anular
                        </ActionButton>
                      </span>
                    ) : (
                      <Badge variant={d.status === "confirmado" ? "success" : "destructive"}>{d.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!data?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    Todavía no se ha hecho ningún sorteo.
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
