"use client";

import { useState, useTransition } from "react";
import { Ban, Check, Gift, Loader2, MessageCircle, PartyPopper } from "lucide-react";
import { FlagList } from "@/components/admin/flag-list";
import { confirmDraw, runDraw, voidDraw, type DrawResult } from "@/app/admin/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RAFFLE } from "@/lib/config";

export function DrawPanel({
  people,
  tickets,
  closed,
  closesLabel,
  contestUrl,
}: {
  people: number;
  tickets: number;
  closed: boolean;
  closesLabel: string;
  contestUrl: string | null;
}) {
  const [exclude, setExclude] = useState(true);
  const [result, setResult] = useState<DrawResult | null>(null);
  const [pending, start] = useTransition();
  const [busy, startBusy] = useTransition();
  const [confirmed, setConfirmed] = useState(false);
  const act = (fn: () => Promise<void>) => startBusy(fn);

  function go() {
    if (!confirm("¿Hacer el sorteo ahora? Queda registrado en el historial.")) return;
    start(async () => {
      await new Promise((r) => setTimeout(r, 1600)); // un poco de suspenso
      setConfirmed(false);
      setResult(await runDraw(exclude));
    });
  }

  const win = result?.ok ? result : null;
  const msg = win
    ? encodeURIComponent(`¡Hola ${win.name.split(" ")[0]}! Te escribimos de ${RAFFLE.brand}: ganaste el sorteo de ${RAFFLE.prize}. 🎉`)
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="size-5" /> Hacer el sorteo
        </CardTitle>
        <CardDescription>
          Cada punto es una oportunidad. Al salir el ganador verás todas sus fotos y videos para confirmar que cumplió. {people.toLocaleString("es-VE")} participantes con {tickets.toLocaleString("es-VE")} boletos.
          Los anulados no entran.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={exclude} onCheckedChange={(v) => setExclude(v === true)} />
          Excluir a quienes ya ganaron en sorteos anteriores
        </label>
        <Button variant="cta" size="xl" className="w-full sm:w-auto" onClick={go} disabled={pending || !tickets || !closed}>
          {pending ? <Loader2 className="animate-spin" /> : <PartyPopper />}
          {pending ? "Sorteando…" : "Sortear ganador"}
        </Button>
        {!closed && (
          <p className="text-muted-foreground text-sm">
            Se habilita cuando cierre el sorteo, después del {closesLabel}. Si quieres sortear antes, cambia la fecha de cierre arriba.
          </p>
        )}
        {result && !result.ok && <p className="text-destructive font-semibold">{result.error}</p>}
      </CardContent>

      <Dialog open={!!win} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogDescription>Ganador por verificar</DialogDescription>
            <DialogTitle className="font-wide text-3xl font-extrabold">{win?.name}</DialogTitle>
          </DialogHeader>
          {win && (
            <div className="space-y-5">
              <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Info k="Cédula" v={win.cedula} />
                <Info k="WhatsApp" v={`+${win.phone}`} />
                <Info k="Puntos" v={String(win.points)} />
                <Info k="Probabilidad" v={`${(win.chance * 100).toFixed(2)} %`} />
              </dl>

              {contestUrl && (
                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p className="font-bold">1. ¿Comentó el video del concurso?</p>
                  <p className="text-muted-foreground">
                    Busca a{" "}
                    {win.instagram ? (
                      <a href={`https://instagram.com/${win.instagram}`} target="_blank" rel="noreferrer" className="text-secondary font-semibold underline">
                        @{win.instagram}
                      </a>
                    ) : (
                      <b>(no dejó usuario de Instagram)</b>
                    )}{" "}
                    en los comentarios del{" "}
                    <a href={contestUrl} target="_blank" rel="noreferrer" className="text-secondary font-semibold underline">
                      video del concurso
                    </a>
                    .
                  </p>
                </div>
              )}
              <FlagList flags={win.flags} title="Ojo, el sistema detectó esto" />
              <div>
                <p className="font-bold">{contestUrl ? "2. " : ""}Revisa que cumpla: {win.media.length} registros</p>
                <p className="text-muted-foreground text-sm">
                  Cada foto o video debe ser en la tienda, con la persona en cámara; los videos, mostrando su emoción por el {RAFFLE.prize}.
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {win.media.map((m) => (
                    <li key={m.id} className="overflow-hidden rounded-md border">
                      {m.kind === "video" ? (
                        <video src={m.url} controls playsInline preload="metadata" className="aspect-square w-full bg-black object-contain" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a href={m.url} target="_blank" rel="noreferrer"><img src={m.url} alt="" className="aspect-square w-full object-cover" /></a>
                      )}
                      <p className="truncate p-2 text-xs">
                        <b>{m.kind === "video" ? "Video" : "Foto"}</b> en {m.store.replace(/^CC\s+/i, "")}
                        {m.status === "rechazado" && <span className="text-destructive"> (rechazado)</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  variant="success"
                  size="lg"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await confirmDraw(win.drawId);
                      setConfirmed(true);
                      toast.success("Ganador confirmado");
                    })
                  }
                >
                  <Check /> Cumplió: confirmar ganador
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  disabled={busy || confirmed}
                  onClick={() =>
                    act(async () => {
                      if (!confirm(`¿Anular a ${win.name}? Quedará descalificado y podrás sortear de nuevo.`)) return;
                      await voidDraw(win.drawId);
                      setResult(null);
                      toast("Sorteo anulado. Puedes sortear de nuevo.");
                    })
                  }
                >
                  <Ban /> No cumplió: anular
                </Button>
              </div>
              {confirmed && (
                <Button asChild variant="cta" size="lg" className="w-full">
                  <a href={`https://wa.me/${win.phone}?text=${msg}`} target="_blank" rel="noreferrer">
                    <MessageCircle /> Avisarle por WhatsApp
                  </a>
                </Button>
              )}
              <p className="text-muted-foreground text-xs">Verifica su cédula en persona antes de entregar el premio.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-muted rounded-lg p-2.5">
      <dt className="text-muted-foreground text-xs">{k}</dt>
      <dd className="font-bold tabular-nums">{v}</dd>
    </div>
  );
}
