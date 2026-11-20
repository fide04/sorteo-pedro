import { Play } from "lucide-react";
import { WantedStars } from "@/components/vice";
import { formatShortDate } from "@/lib/config";
import type { GalleryItem, RankRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function GalleryGrid({ items, empty }: { items: GalleryItem[]; empty?: React.ReactNode }) {
  if (!items.length)
    return (
      <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center">
        {empty ?? "Todavía no hay fotos ni videos. El primero puede ser el tuyo: escanea el QR en cualquier tienda."}
      </p>
    );
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((g, i) => (
        <li key={g.id} data-reveal style={{ "--i": i % 4 } as React.CSSProperties} className="card-tilt bg-card overflow-hidden rounded-md border">
          <div className="relative">
            {g.kind === "video" && g.video ? (
              <video
                src={g.video}
                poster={g.src || undefined}
                preload="none"
                controls
                playsInline
                className="bg-ink aspect-square w-full object-cover"
                aria-label={`Video de ${g.name} en ${g.store}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.src} alt={`Foto de ${g.name} en ${g.store}`} loading="lazy" decoding="async" className="bg-muted aspect-square w-full object-cover" />
            )}
            {g.kind === "video" && (
              <span className="bg-pink pointer-events-none absolute top-2 left-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold text-white">
                <Play className="size-3 fill-current" /> Video
              </span>
            )}
          </div>
          <div className="p-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-bold">{g.name}</span>
              <span className="font-narrow text-violet shrink-0 text-lg font-extrabold tabular-nums">
                {g.points} <span className="text-xs font-semibold">pts</span>
              </span>
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {g.store.replace(/^CC\s+/i, "")}, {formatShortDate(g.day)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RankingList({ rows }: { rows: RankRow[] }) {
  if (!rows.length)
    return <p className="text-muted-foreground rounded-md border border-dashed p-8 text-center">Nadie tiene puntos todavía.</p>;
  return (
    <ol className="divide-y border-y">
      {rows.map((r, i) => (
        <li key={i} data-reveal style={{ "--i": i } as React.CSSProperties} className="flex items-center gap-3 py-3">
          <span
            className={cn(
              "font-narrow w-9 shrink-0 text-center text-3xl leading-none font-extrabold tabular-nums",
              i < 3 ? "hud-text [text-shadow:2px_0_0_var(--ink),-2px_0_0_var(--ink),0_2px_0_var(--ink),0_-2px_0_var(--ink),0_3px_0_var(--ink)]" : "text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{r.name}</p>
            <WantedStars small filled={r.stores} total={r.storesTotal} className="flex" />
          </div>
          <span className="font-narrow text-violet text-3xl font-extrabold tabular-nums" data-count={r.points}>
            {r.points}
          </span>
        </li>
      ))}
    </ol>
  );
}
