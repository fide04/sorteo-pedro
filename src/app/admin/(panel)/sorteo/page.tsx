import { confirmDraw, voidDraw } from "../../actions";
import { ActionButton } from "@/components/admin/action-button";
import { DrawPanel } from "@/components/admin/draw-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClosingForm } from "@/components/admin/closing-form";
import { allRanked, getRaffleDates } from "@/lib/data";
import { daysUntil, formatDate, raffleClosed, raffleNotStarted, registrationState, TZ } from "@/lib/config";
import { QrSwitch } from "@/components/admin/qr-switch";
import { db } from "@/lib/supabase";

type Draw = { id: string; status: string; note: string | null; created_at: string; winner_points: number; total_points: number; total_participants: number; participants: { full_name: string; cedula: string } | null };

export default async function Sorteo() {
  const [ranked, dates] = await Promise.all([allRanked(), getRaffleDates()]);
  const { closesAt, startsAt, announceAt } = dates;
  const pool = ranked.filter((p) => p.points > 0 && !p.disqualified);
  const closed = raffleClosed(closesAt);
  const notStarted = raffleNotStarted(startsAt);
  const daysLeft = daysUntil(closesAt) + 1;
  const state = registrationState(dates);
  const qrStatus =
    state === "abierto"
      ? dates.qrMode === "open"
        ? "Ahora mismo: el registro está ABIERTO (abierto a mano, sin importar las fechas)."
        : "Ahora mismo: el registro está ABIERTO."
      : state === "pausado"
        ? "Ahora mismo: el registro está PAUSADO. Los QR muestran «pausado por un momento»."
        : state === "antes"
          ? `Ahora mismo: CERRADO hasta el ${formatDate(startsAt)} (todavía no empieza).`
          : "Ahora mismo: CERRADO (ya pasó la fecha de cierre).";
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
          <CardTitle>Registro por QR</CardTitle>
          <CardDescription>Activa o pausa los QR de todas las tiendas sin cambiar las fechas.</CardDescription>
        </CardHeader>
        <CardContent>
          <QrSwitch mode={dates.qrMode} status={qrStatus} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Fechas y video del concurso</CardTitle>
          <CardDescription>
            {notStarted
              ? `Todavía no empieza: abre el ${formatDate(startsAt)} y cierra el ${formatDate(closesAt)}. Mientras tanto los QR muestran cuándo empieza.`
              : closed
                ? `El sorteo cerró el ${formatDate(closesAt)}. Los QR ya no aceptan fotos ni videos. Anuncio del ganador: ${formatDate(announceAt)}.`
                : `Abierto hasta el ${formatDate(closesAt)} inclusive (${daysLeft === 1 ? "hoy es el último día" : `quedan ${daysLeft} días`}). Anuncio del ganador: ${formatDate(announceAt)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClosingForm dates={dates} />
        </CardContent>
      </Card>
      <DrawPanel people={pool.length} tickets={pool.reduce((a, p) => a + p.points, 0)} closed={closed} closesLabel={formatDate(closesAt)} contestUrl={dates.contestUrl} />
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
