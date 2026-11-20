import Link from "next/link";
import { Check, ExternalLink, X } from "lucide-react";
import { approveAsPhoto, setCheckinStatus } from "../../actions";
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
  participants: { full_name: string; cedula: string } | null; stores: { name: string } | null;
};

export default async function Registros({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = "todos" } = await searchParams;
  let q = db()
    .from("checkins")
    .select("id,day,status,photo_path,thumb_path,media_type,created_at,participants(full_name,cedula),stores(name)")
    .order("created_at", { ascending: false })
    .limit(60);
  if (estado !== "todos") q = q.eq("status", estado);
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
              href={`?estado=${f.key}`}
              className={cn("rounded-full border px-3 py-1 text-sm font-semibold", estado === f.key ? "bg-foreground text-background" : "text-muted-foreground")}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!rows.length && <p className="text-muted-foreground py-10 text-center">No hay registros todavía.</p>}
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
                  <p className="truncate text-sm font-semibold">{r.participants?.full_name}</p>
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
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
