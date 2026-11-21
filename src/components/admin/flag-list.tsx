import { AlertTriangle } from "lucide-react";
import type { Flag } from "@/lib/fraud";

const label: Record<Flag["kind"], string> = {
  repetida: "Foto repetida",
  viaje: "Viaje imposible",
  vieja: "Foto vieja",
  dispositivo: "Mismo teléfono",
};

/** Lista de alertas de posible trampa (no castigan solas: piden revisión). */
export function FlagList({ flags, title = "Alertas para revisar" }: { flags: Flag[]; title?: string }) {
  if (!flags.length) return null;
  return (
    <div className="border-warning/40 bg-warning/10 rounded-lg border p-3">
      <p className="text-warning flex items-center gap-2 text-sm font-bold">
        <AlertTriangle className="size-4" /> {title} ({flags.length})
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {flags.map((f, i) => (
          <li key={i}>
            <b>{label[f.kind]}:</b> <span className="text-muted-foreground">{f.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
