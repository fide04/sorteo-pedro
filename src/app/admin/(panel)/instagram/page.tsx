import { Check, ExternalLink, X } from "lucide-react";
import { setClaimStatus } from "../../actions";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RAFFLE } from "@/lib/config";
import { db } from "@/lib/supabase";
import type { ReviewStatus } from "@/lib/types";

type Row = {
  id: string; post_url: string; status: ReviewStatus; created_at: string;
  participants: { full_name: string; instagram: string | null } | null;
  checkins: { stores: { name: string } | null } | null;
};

export default async function InstagramClaims() {
  const { data } = await db()
    .from("social_claims")
    .select("id,post_url,status,created_at,participants(full_name,instagram),checkins(stores(name))")
    .order("created_at", { ascending: false })
    .limit(150)
    .returns<Row[]>();
  const rank = { pendiente: 0, aprobado: 1, rechazado: 2 };
  const rows = (data ?? []).sort((a, b) => rank[a.status] - rank[b.status]); // pendientes primero

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicaciones de Instagram</CardTitle>
        <CardDescription>
          Abre cada enlace, confirma que etiqueta a @{RAFFLE.instagram} y apruébalo para sumar +{RAFFLE.points.post} puntos.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Participante</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead>Publicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-5 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-5">
                  <div className="font-semibold">{r.participants?.full_name}</div>
                  {r.participants?.instagram && <div className="text-muted-foreground text-xs">@{r.participants.instagram}</div>}
                </TableCell>
                <TableCell>{r.checkins?.stores?.name}</TableCell>
                <TableCell>
                  <Button asChild size="sm" variant="link" className="px-0">
                    <a href={r.post_url} target="_blank" rel="noreferrer">
                      Abrir <ExternalLink />
                    </a>
                  </Button>
                </TableCell>
                <TableCell>
                  <Badge variant={r.status === "aprobado" ? "success" : r.status === "rechazado" ? "destructive" : "warning"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="inline-flex gap-1.5">
                    <ActionButton size="sm" variant={r.status === "aprobado" ? "success" : "outline"} action={setClaimStatus.bind(null, r.id, "aprobado")} done="Aprobado">
                      <Check /> Aprobar
                    </ActionButton>
                    <ActionButton size="sm" variant={r.status === "rechazado" ? "destructive" : "outline"} action={setClaimStatus.bind(null, r.id, "rechazado")} aria-label="Rechazar">
                      <X />
                    </ActionButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-10 text-center">
                  Aún no hay publicaciones enviadas.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
