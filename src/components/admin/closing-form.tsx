"use client";

import { useActionState, useEffect } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setRaffleSettings } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RaffleDates } from "@/lib/config";

export function ClosingForm({ dates }: { dates: RaffleDates }) {
  const [state, action, pending] = useActionState(setRaffleSettings, null);
  useEffect(() => {
    if (state?.ok) toast.success(state.note || "Guardado");
    else if (state?.error) toast.error(state.error);
  }, [state]);
  const field = "h-10 [color-scheme:dark]";
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="startsAt">Primer día para participar</Label>
          <Input id="startsAt" name="startsAt" type="date" defaultValue={dates.startsAt} required className={field} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="closesAt">Último día para participar</Label>
          <Input id="closesAt" name="closesAt" type="date" defaultValue={dates.closesAt} required className={field} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="announceAt">Anuncio del ganador</Label>
          <Input id="announceAt" name="announceAt" type="date" defaultValue={dates.announceAt} required className={field} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contestUrl">Video del concurso en Instagram</Label>
        <Input id="contestUrl" name="contestUrl" inputMode="url" placeholder="https://www.instagram.com/reel/…" defaultValue={dates.contestUrl ?? ""} className="h-10" />
        <p className="text-muted-foreground text-xs">
          Publica el video en Instagram, toca Compartir → Copiar enlace y pégalo aquí. La web le pide a todos comentarlo (es requisito, no da puntos) y el
          usuario de Instagram pasa a ser obligatorio al registrarse. Déjalo vacío para quitarlo.
        </p>
      </div>
      <Button disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <CalendarClock />} Guardar
      </Button>
    </form>
  );
}
