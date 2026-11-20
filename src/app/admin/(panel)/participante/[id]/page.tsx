import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Check, ExternalLink, MessageCircle, RotateCcw, Trash2, X } from "lucide-react";
import { approveAsPhoto, deleteCheckin, setCheckinStatus, setClaimStatus, setDisqualified } from "../../../actions";
import { DeleteParticipant } from "@/components/admin/delete-participant";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RAFFLE, TZ } from "@/lib/config";
import { activeStores } from "@/lib/data";
import { BUCKET, db } from "@/lib/supabase";
import type { ParticipantPoints, ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type Ch = { id: string; store_id: string; day: string; status: ReviewStatus; media_type: "foto" | "video"; photo_path: string; created_at: string; stores: { name: string } | null };
type Cl = { id: string; post_url: string; status: ReviewStatus; checkin_id: string };

const statusVariant = (s: string) => (s === "aprobado" ? "success" : s === "rechazado" ? "destructive" : "warning");

export default async function Participante({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = db();
  const [{ data: p }, { data: checks }, { data: claims }, stores, { data: draws }] = await Promise.all([
    sb.from("participant_points").select("*").eq("id", id).maybeSingle<ParticipantPoints>(),
    sb.from("checkins").select("id,store_id,day,status,media_type,photo_path,created_at,stores(name)").eq("participant_id", id).order("created_at").returns<Ch[]>(),
    sb.from("social_claims").select("id,post_url,status,checkin_id").eq("participant_id", id).returns<Cl[]>(),
    activeStores(),
    sb.from("draws").select("id,status,created_at,note").eq("participant_id", id),
  ]);
  if (!p) notFound();
  const rows = checks ?? [];
  const { data: signed } = rows.length ? await sb.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.photo_path), 3600) : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl ?? ""]));
  const fmt = new Intl.DateTimeFormat("es-VE", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  const ok = rows.filter((r) => r.status === "aprobado");
  const fotos = ok.filter((r) => r.media_type === "foto").length;
  const videos = ok.filter((r) => r.media_type === "video").length;
  const allStores = p.stores_total > 0 && p.stores_visited >= p.stores_total;
  const breakdown = [
    { t: `${fotos} ${fotos === 1 ? "foto" : "fotos"} × ${RAFFLE.points.photo}`, v: fotos * RAFFLE.points.photo },
    { t: `${videos} ${videos === 1 ? "video" : "videos"} × ${RAFFLE.points.video}`, v: videos * RAFFLE.points.video },
    { t: `Bonus todas las tiendas${allStores ? "" : ` (lleva ${p.stores_visited} de ${p.stores_total})`}`, v: allStores ? RAFFLE.points.allStoresBonus : 0 },
    { t: `${p.posts} ${p.posts === 1 ? "publicación" : "publicaciones"} de Instagram × ${RAFFLE.points.post}`, v: p.posts * RAFFLE.points.post },
  ];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin">
          <ArrowLeft /> Ranking
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">
              {p.full_name} {p.disqualified && <Badge variant="destructive">Anulado</Badge>}
            </CardTitle>
            <CardDescription className="mt-1 space-x-3">
              <span>Cédula {p.cedula}</span>
              <a className="hover:underline" href={`https://wa.me/${p.phone}`} target="_blank" rel="noreferrer">
                <MessageCircle className="inline size-3.5" /> +{p.phone}
              </a>
              {p.instagram && (
                <a className="text-secondary hover:underline" href={`https://instagram.com/${p.instagram}`} target="_blank" rel="noreferrer">
                  @{p.instagram}
                </a>
              )}
              <span>Desde {fmt.format(new Date(p.created_at))}</span>
            </CardDescription>
          </div>
          <div className="flex gap-2">
          <ActionButton
            size="sm"
            variant={p.disqualified ? "outline" : "destructive"}
            action={setDisqualified.bind(null, p.id, !p.disqualified)}
            confirm={p.disqualified ? undefined : `¿Anular a ${p.full_name}? No participará en el sorteo.`}
          >
            {p.disqualified ? <RotateCcw /> : <Ban />} {p.disqualified ? "Reactivar" : "Anular"}
          </ActionButton>
          <DeleteParticipant id={p.id} name={p.full_name} cedula={p.cedula} files={rows.length} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Puntos</p>
            <p className="text-5xl font-bold tabular-nums">{p.points}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {breakdown.map((b) => (
                <li key={b.t} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{b.t}</span>
                  <span className="font-semibold tabular-nums">+{b.v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Tiendas visitadas</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {stores.map((s) => {
                const visits = rows.filter((r) => r.store_id === s.id && r.status !== "rechazado");
                return (
                  <li key={s.id} className="flex items-center gap-2">
                    <span className={cn("grid size-5 place-items-center rounded-full", visits.length ? "bg-success text-ink" : "border-border border")}>
                      {visits.length > 0 && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={visits.length ? "font-semibold" : "text-muted-foreground"}>{s.name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {visits.length ? `${visits.length} ${visits.length === 1 ? "vez" : "veces"}` : "Sin visitar"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos y videos ({rows.length})</CardTitle>
          <CardDescription>En orden, desde el primero.</CardDescription>
        </CardHeader>
        <CardContent>
          {!rows.length && <p className="text-muted-foreground">Todavía no subió nada.</p>}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => {
              const claim = (claims ?? []).find((c) => c.checkin_id === r.id);
              return (
                <li key={r.id} className={cn("overflow-hidden rounded-lg border", r.status === "rechazado" && "opacity-60")}>
                  <div className="relative aspect-[4/5] bg-black/30">
                    {r.media_type === "video" ? (
                      <video src={url.get(r.photo_path)} controls playsInline preload="metadata" className="size-full bg-black object-contain" />
                    ) : (
                      <a href={url.get(r.photo_path)} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url.get(r.photo_path)} alt="" loading="lazy" className="size-full object-cover" />
                      </a>
                    )}
                    <Badge variant={statusVariant(r.status)} className="absolute top-2 left-2">
                      {r.status}
                    </Badge>
                    <Badge className="absolute bottom-2 left-2">{r.media_type === "video" ? `Video +${RAFFLE.points.video}` : `Foto +${RAFFLE.points.photo}`}</Badge>
                  </div>
                  <div className="space-y-2 p-2.5 text-xs">
                    <p className="text-sm font-semibold">{r.stores?.name}</p>
                    <p className="text-muted-foreground">{fmt.format(new Date(r.created_at))}</p>
                    {claim && (
                      <div className="flex items-center justify-between gap-2">
                        <a href={claim.post_url} target="_blank" rel="noreferrer" className="text-secondary inline-flex items-center gap-1 hover:underline">
                          Instagram <ExternalLink className="size-3" />
                        </a>
                        <Badge variant={statusVariant(claim.status)}>{claim.status}</Badge>
                      </div>
                    )}
                    {claim?.status === "pendiente" && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <ActionButton size="sm" variant="outline" action={setClaimStatus.bind(null, claim.id, "aprobado")}>
                          Aprobar IG
                        </ActionButton>
                        <ActionButton size="sm" variant="outline" action={setClaimStatus.bind(null, claim.id, "rechazado")}>
                          Rechazar IG
                        </ActionButton>
                      </div>
                    )}
                    {r.media_type === "video" && r.status !== "rechazado" && (
                      <ActionButton size="sm" variant="outline" className="w-full" action={approveAsPhoto.bind(null, r.id)}>
                        Vale como foto (+{RAFFLE.points.photo})
                      </ActionButton>
                    )}
                    <div className="grid grid-cols-2 gap-1.5">
                      <ActionButton size="sm" variant={r.status === "aprobado" ? "success" : "outline"} action={setCheckinStatus.bind(null, r.id, "aprobado")} aria-label="Aprobar">
                        <Check />
                      </ActionButton>
                      <ActionButton size="sm" variant={r.status === "rechazado" ? "destructive" : "outline"} action={setCheckinStatus.bind(null, r.id, "rechazado")} aria-label="Rechazar">
                        <X />
                      </ActionButton>
                    </div>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      className="text-destructive w-full"
                      action={deleteCheckin.bind(null, r.id)}
                      confirm={`¿Borrar ${r.media_type === "video" ? "este video" : "esta foto"} para siempre? Se restan sus puntos y sale de la galería.`}
                      done="Borrado"
                    >
                      <Trash2 /> Borrar
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      {!!draws?.length && (
        <Card>
          <CardHeader>
            <CardTitle>En sorteos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {draws.map((d) => (
              <p key={d.id}>
                {fmt.format(new Date(d.created_at))}: <Badge variant={d.status === "confirmado" ? "success" : d.status === "anulado" ? "destructive" : "warning"}>{d.status}</Badge>{" "}
                <span className="text-muted-foreground">{d.note}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
