import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TZ } from "@/lib/config";
import { db } from "@/lib/supabase";

export const metadata = { title: "Actividad | Sorteo TechnoCell" };

export default async function Actividad() {
  const { data } = await db().from("admin_log").select("*").order("created_at", { ascending: false }).limit(300);
  const fmt = new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit" });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad del equipo</CardTitle>
        <CardDescription>
          Todo lo que se hace en el panel queda registrado: quién entró, qué aprobó, rechazó o borró, y cada sorteo. Nadie puede borrar esta lista desde el
          panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Cuándo</TableHead>
              <TableHead>Quién</TableHead>
              <TableHead>Qué hizo</TableHead>
              <TableHead className="pr-5">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-muted-foreground pl-5 text-sm">{fmt.format(new Date(r.created_at))}</TableCell>
                <TableCell className="font-semibold">{r.admin}</TableCell>
                <TableCell>{r.action}</TableCell>
                <TableCell className="text-muted-foreground max-w-md truncate pr-5 text-sm">{r.detail}</TableCell>
              </TableRow>
            ))}
            {!data?.length && (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground py-10 text-center">
                  Todavía no hay actividad registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
