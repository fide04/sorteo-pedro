// Gráficas livianas en HTML/CSS (sin librerías): una sola serie, un color, con tooltip al pasar el mouse
// y tabla accesible. Color validado contra la superficie oscura del panel (contraste ≥ 3:1).
import { cn } from "@/lib/utils";

type Datum = { label: string; value: number; key: string };
const fmt = (n: number) => n.toLocaleString("es-VE");

/** Columnas verticales (tiempo u horas). */
export function Columns({ data, unit = "registros", every = 1, height = 160 }: { data: Datum[]; unit?: string; every?: number; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <p className="text-muted-foreground mb-1 text-[11px]" aria-hidden>
        Máximo: {fmt(max)} {unit}
      </p>
      <div className="relative" style={{ height }}>
        {/* guía recesiva del máximo */}
        <div className="border-border absolute inset-x-0 top-0 border-t border-dashed" aria-hidden />
        <div className="flex h-full items-end gap-[2px]" role="img" aria-label={`Gráfica de ${unit}`}>
          {data.map((d) => (
            <div key={d.key} className="group relative flex h-full flex-1 items-end">
              <div
                className="bg-primary w-full rounded-t-[4px] transition-opacity group-hover:opacity-80"
                style={{ height: d.value ? `max(3px, ${(d.value / max) * 100}%)` : 0 }}
              />
              {/* zona de hover más grande que la barra */}
              <div className="bg-popover text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block">
                <b>{d.label}</b>: {fmt(d.value)} {unit}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-border mt-1 flex gap-[2px] border-t pt-1" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="text-muted-foreground flex-1 truncate text-center text-[10px]">
            {i % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <DataTable data={data} unit={unit} />
    </figure>
  );
}

/** Barras horizontales con el valor al final (ranking de tiendas). */
export function Bars({ data, unit = "registros" }: { data: Datum[]; unit?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <figure>
      <ul className="space-y-2.5">
        {data.map((d, i) => (
          <li key={d.key} className="group grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3">
            <span className={cn("truncate text-sm", i === 0 && d.value > 0 ? "font-bold" : "text-muted-foreground")}>{d.label}</span>
            <div className="bg-muted/60 relative h-5 rounded-[4px]">
              <div className="bg-primary h-full rounded-[4px]" style={{ width: d.value ? `max(4px, ${(d.value / max) * 100}%)` : 0 }} />
            </div>
            <span className="w-10 text-right text-sm font-bold tabular-nums">{fmt(d.value)}</span>
          </li>
        ))}
      </ul>
      <DataTable data={data} unit={unit} />
    </figure>
  );
}

function DataTable({ data, unit }: { data: Datum[]; unit: string }) {
  return (
    <details className="mt-2">
      <summary className="text-muted-foreground cursor-pointer text-xs">Ver tabla</summary>
      <table className="mt-2 w-full text-sm">
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-border border-b last:border-0">
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right tabular-nums">
                {fmt(d.value)} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
