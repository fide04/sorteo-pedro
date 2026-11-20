import Link from "next/link";
import { Check, ExternalLink, Trash2, X } from "lucide-react";
import { approveAsPhoto, deleteCheckin, setCheckinStatus } from "../../actions";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db, BUCKET } from "@/lib/supabase";
import type { ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const filters: { key: ReviewStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "aprobado", label: "Aprobados" },
  { key: "rechazado", label: "Rechazados" },
];

type Row = {
  id: string; day: string; status: ReviewStatus; photo_path: string; thumb_path: string | null; media_type: "foto" | "video"; created_at: string;
  participant_id: string;
  participants: { full_name: string; cedula: string } | null; stores: { name: string } | null;
};
type StoreOpt = { id: string; name: string };

export default async function Registros({ searchParams }: { searchParams: Promise<{ estado?: string; tienda?: string; tipo?: string }> }) {
  const { estado = "todos", tienda = "", tipo = "" } = await searchParams;
  const { data: storeList } = await db().from("stores").select("id,name").order("created_at").returns<StoreOpt[]>();
  let q = db()
    .from("checkins")
    .select("id,day,status,photo_path,thumb_path,media_type,created_at,participant_id,participants(full_name,cedula),stores(name)")
    .order("created_at", { ascending: false })
    .limit(90);
  if (estado !== "todos") q = q.eq("status", estado);
  if (/^[0-9a-f-]{36}$/.test(tienda)) q = q.eq("store_id", tienda);
  if (tipo === "foto" || tipo === "video") q = q.eq("media_type", tipo);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ estado, tienda, tipo, ...patch });
    [...p.keys()].forEach((k) => (!p.get(k) || p.get(k) === "todos") && p.delete(k));
    return `?${p}`;
  };
  const { data } = await q.returns<Row[]>();
  const rows = data ?? [];
  const { data: signed } = rows.length
    ? await db().storage.from(BUCKET).createSignedUrls(rows.map((r) => r.photo_path), 60 * 60)
    : { data: [] };
  const url = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl ?? undefined]));

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Fotos y videos</CardTitle>
          <CardDescription>
            Todo suma al instante y sale en la galería. Quita lo ofensivo cuando lo veas; la revisión completa se hace al
            sortear, con las fotos y videos del ganador.
          </CardDescription>
        </div>
        <div className="flex gap-1">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={qs({ estado: f.key })}
              className={cn("rounded-full border px-3 py-1 text-sm font-semibold", estado === f.key ? "bg-foreground text-background" : "text-muted-foreground")}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex w-full flex-wrap gap-1">
          <Chip href={qs({ tienda: "" })} on={!tienda}>Todas las tiendas</Chip>
          {(storeList ?? []).map((st) => (
            <Chip key={st.id} href={qs({ tienda: st.id })} on={tienda === st.id}>
              {st.name.replace(/^CC\s+/i, "")}
            </Chip>
          ))}
          <span className="mx-1 w-px self-stretch bg-[var(--border)]" />
          <Chip href={qs({ tipo: "" })} on={!tipo}>Fotos y videos</Chip>
          <Chip href={qs({ tipo: "foto" })} on={tipo === "foto"}>Solo fotos</Chip>
          <Chip href={qs({ tipo: "video" })} on={tipo === "video"}>Solo videos</Chip>
        </div>
      </CardHeader>
      <CardContent>
        {!rows.length && <p className="text-muted-foreground py-10 text-center">No hay registros con estos filtros.</p>}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r.id} className={cn("overflow-hidden rounded-lg border", r.status === "rechazado" && "opacity-60")}>
              <a href={url.get(r.photo_path)} target="_blank" rel="noreferrer" className="group relative block aspect-[4/5] bg-black/30">
                {r.media_type === "video" ? (
                  <video src={url.get(r.photo_path)} controls playsInline preload="metadata" className="size-full bg-black object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url.get(r.photo_path)} alt="" loading="lazy" className="size-full object-cover" />
                )}
                <ExternalLink className="absolute top-2 right-2 size-4 opacity-0 drop-shadow group-hover:opacity-100" />
                <Badge variant={r.status === "aprobado" ? "success" : r.status === "rechazado" ? "destructive" : "warning"} className="absolute top-2 left-2 backdrop-blur">
                  {r.status}
                </Badge>
                {r.media_type === "video" && <Badge className="absolute bottom-2 left-2">Video +4</Badge>}
              </a>
              <div className="space-y-2 p-2.5">
                <div>
                  <Link href={`/admin/participante/${r.participant_id}`} className="block truncate text-sm font-semibold hover:underline">
                    {r.participants?.full_name}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">
                    {r.participants?.cedula} · {r.stores?.name} · {r.day}
                  </p>
                </div>
                {r.media_type === "video" && r.status !== "rechazado" && (
                  <ActionButton size="sm" variant="outline" className="w-full" action={approveAsPhoto.bind(null, r.id)} done="Contado como foto (+2)">
                    Vale como foto (+2)
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
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", on ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:text-foreground")}>
      {children}
    </Link>
  );
}
