"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Instagram } from "@/components/icons";
import { submitPost } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StubText, Ticket } from "@/components/ticket";
import { CountUp } from "@/components/fx/count-up";
import { Tilt } from "@/components/fx/tilt";
import { WantedStars } from "@/components/vice";
import { formatDate, RAFFLE } from "@/lib/config";
import type { Passport } from "@/lib/types";
import { cn } from "@/lib/utils";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function PassportView({
  passport,
  justStore,
  gained,
  pendingVideo,
  shareFile,
  checkinId,
}: {
  passport: Passport;
  justStore?: string;
  gained?: number;
  pendingVideo?: boolean;
  shareFile?: File | null;
  checkinId?: string | null;
}) {
  const visited = passport.stores.filter((s) => s.visited).length;
  const pendingExtra = passport.pendingVideos * RAFFLE.points.video + passport.pendingPosts * RAFFLE.points.post;
  const left = passport.storesTotal - visited;
  const claimId = checkinId ?? passport.lastCheckinId;
  const caption = `Participando por un ${RAFFLE.prize} gratis con @${RAFFLE.instagram} ${RAFFLE.hashtag}`;

  return (
    <div className="space-y-8">
      {justStore && (
        <div className="text-center" role="status">
          <p className="hud-text mission-in font-wide text-[34px] leading-none font-black sm:text-5xl">¡Misión superada!</p>
          <p className="mt-3 font-semibold">
            {pendingVideo
              ? `Video recibido en ${justStore}. Sumas ${RAFFLE.points.video} puntos cuando el equipo lo apruebe.`
              : `+${gained} puntos en ${justStore}`}
          </p>
          {!pendingVideo && (
            <a href="/galeria" className="text-violet mt-1 inline-block font-semibold underline underline-offset-2">
              Ver tu foto en la galería
            </a>
          )}
        </div>
      )}

      <Tilt max={12}>
      <div className="tilt-shadow" aria-hidden />
      <Ticket tilt={false} sheen stub={<StubText>{RAFFLE.prize}</StubText>}>
        <p className="text-muted-foreground text-sm">Puntos de</p>
        <p className="font-wide text-xl leading-tight font-extrabold">{passport.firstName}</p>
        <p className="mt-4 flex items-baseline gap-2">
          <span className="font-narrow vice-text text-[88px] leading-[0.9] font-extrabold tabular-nums"><CountUp to={passport.points} /></span>
          <span className="font-semibold">{passport.points === 1 ? "punto" : "puntos"}</span>
        </p>
        {pendingExtra > 0 && (
          <p className="text-muted-foreground mt-2 text-sm">+{pendingExtra} en revisión</p>
        )}
      </Ticket>
      </Tilt>

      <section aria-labelledby="tiendas-visitadas">
        <div className="flex items-center justify-between gap-3">
          <h2 id="tiendas-visitadas" className="font-wide text-lg font-extrabold">
            Tus tiendas
          </h2>
          <WantedStars filled={visited} total={passport.storesTotal} className="flex gap-0.5" />
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          {left === 0
            ? `Visitaste todas. Ya tienes los ${RAFFLE.points.allStoresBonus} puntos extra.`
            : `Te ${left === 1 ? "falta" : "faltan"} ${plural(left, "tienda", "tiendas")} para ganar ${RAFFLE.points.allStoresBonus} puntos extra.`}
        </p>
        <ul className="mt-4 divide-y border-y">
          {passport.stores.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full border-2",
                  s.visited ? "border-violet bg-violet text-white" : "border-input",
                )}
                aria-hidden
              >
                {s.visited && <Check className="size-3.5" strokeWidth={3.5} />}
              </span>
              <span className={cn("flex-1", s.visited ? "font-semibold" : "text-muted-foreground")}>{s.name}</span>
              <span className="text-muted-foreground text-sm">
                {s.pending ? "Video en revisión" : s.visited && s.lastDay ? formatDate(s.lastDay) : "Sin visitar"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {claimId && <InstagramCard checkinId={claimId} shareFile={shareFile} caption={caption} />}
    </div>
  );
}

function InstagramCard({ checkinId, shareFile, caption }: { checkinId: string; shareFile?: File | null; caption: string }) {
  const [url, setUrl] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const isVideo = shareFile ? shareFile.type.startsWith("video/") : undefined;

  async function share() {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {}
    if (!shareFile) return;
    // En el celular se abre el menú del sistema: elige Instagram → Historia, Reel o Feed.
    if (navigator.canShare?.({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile] });
        toast.success("Texto copiado: pégalo en tu publicación y etiquétanos.");
      } catch {}
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(shareFile);
      a.download = shareFile.name;
      a.click();
      toast("Descargamos tu archivo y copiamos el texto. Ábrelo en Instagram para publicarlo.");
    }
  }

  function send() {
    start(async () => {
      const r = await submitPost({ checkinId, url });
      if (r.ok) {
        setSent(true);
        toast.success("Enlace enviado");
      } else toast.error(r.error);
    });
  }

  return (
    <section aria-labelledby="ig" className="bg-card rounded-lg border p-5">
      <h2 id="ig" className="font-wide text-lg font-extrabold">
        Gana {RAFFLE.points.post} puntos más en Instagram
      </h2>
      {shareFile && (
        <>
          <Button variant="cta" size="xl" className="mt-4 w-full" onClick={share}>
            <Instagram className="size-5" /> Compartir en Instagram
          </Button>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {isVideo
              ? "Se abre Instagram con tu video listo para Historia o Reel."
              : "Se abre Instagram con tu foto lista en formato Historia."}{" "}
            Copiamos el texto con la etiqueta @{RAFFLE.instagram} para que lo pegues.
          </p>
        </>
      )}
      {sent ? (
        <p className="text-success mt-4 font-semibold">Recibimos tu enlace. Sumamos los puntos cuando lo revisemos.</p>
      ) : (
        <div className="mt-5 space-y-2 border-t pt-4">
          <Label htmlFor="post">Cuando publiques, pega aquí el enlace</Label>
          <p className="text-muted-foreground text-sm">
            {isVideo === undefined
              ? "Enlace de tu publicación, Reel o Historia."
              : isVideo
                ? "Enlace de tu Reel o Historia (instagram.com/reel/…)."
                : "Enlace de tu publicación o Historia (instagram.com/p/…)."}{" "}
            En Instagram: Compartir → Copiar enlace.
          </p>
          <div className="flex gap-2">
            <Input id="post" inputMode="url" placeholder="instagram.com/…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <Button size="lg" variant="outline" disabled={!url || pending} onClick={send}>
              {pending ? <Loader2 className="animate-spin" /> : "Enviar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
