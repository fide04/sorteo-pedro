"use client";

import { useTransition } from "react";
import { CalendarClock, Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { setQrMode } from "@/app/admin/actions";
import type { QrMode } from "@/lib/config";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: QrMode; label: string; hint: string; icon: typeof Play }[] = [
  { mode: "auto", label: "Según fechas", hint: "Se abren y cierran solos con las fechas del sorteo", icon: CalendarClock },
  { mode: "open", label: "Abiertos", hint: "El registro funciona ya, sin importar las fechas", icon: Play },
  { mode: "paused", label: "Pausados", hint: "Nadie puede registrarse hasta que lo vuelvas a abrir", icon: Pause },
];

/** Interruptor de los QR: no cambia las fechas. */
export function QrSwitch({ mode, status }: { mode: QrMode; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <div className="bg-muted grid gap-1 rounded-lg p-1 sm:grid-cols-3" role="radiogroup" aria-label="Estado de los QR">
        {OPTIONS.map((o) => {
          const on = o.mode === mode;
          return (
            <button
              key={o.mode}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={pending}
              onClick={() =>
                !on &&
                start(async () => {
                  await setQrMode(o.mode);
                  toast.success(o.mode === "open" ? "QR abiertos" : o.mode === "paused" ? "QR pausados" : "QR según fechas");
                })
              }
              className={cn(
                "flex items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors",
                on
                  ? o.mode === "paused"
                    ? "bg-destructive text-white"
                    : o.mode === "open"
                      ? "bg-success text-ink"
                      : "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <o.icon className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="block text-sm font-bold">{o.label}</span>
                <span className={cn("block text-xs", on ? "opacity-90" : "opacity-75")}>{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-sm">
        {pending && <Loader2 className="size-4 animate-spin" />}
        <span>{status}</span>
      </p>
    </div>
  );
}
