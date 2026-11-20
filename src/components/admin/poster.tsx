import { StubText, Ticket } from "@/components/ticket";
import { ViceScene } from "@/components/vice";
import { RAFFLE } from "@/lib/config";

/** Cartel A4 para cada tienda. Misma identidad que el sitio: franja azul TechnoCell y el boleto. */
export function Poster({ storeName, qr }: { storeName: string; qr: string }) {
  return (
    <section
      className="vice-sky relative mx-auto my-4 flex flex-col overflow-hidden text-white shadow-2xl print:my-0 print:shadow-none"
      style={{ width: "210mm", height: "297mm", padding: "16mm 16mm 66mm", breakAfter: "page", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <ViceScene className="absolute inset-x-0 bottom-0 h-[64mm]" />
      <p className="font-wide relative font-extrabold" style={{ fontSize: "16pt" }}>
        TechnoCell <span className="text-sky font-normal">2015</span>
      </p>

      <h1 className="font-wide relative font-black tracking-tight" style={{ fontSize: "58pt", lineHeight: 0.92, marginTop: "10mm", textShadow: "0 1.2mm 0 rgb(27 8 51 / 0.6)" }}>
        Sorteamos un <span className="hud-text whitespace-nowrap">{RAFFLE.prize}</span>
      </h1>
      <p className="relative" style={{ fontSize: "19pt", lineHeight: 1.3, marginTop: "6mm", maxWidth: "150mm", color: "rgb(255 255 255 / 0.9)" }}>
        Es gratis. Escanea el código, sube una foto en la tienda y llévate un boleto.
      </p>

      <div className="relative my-auto" style={{ paddingTop: "8mm", paddingBottom: "8mm" }}>
      <Ticket tilt={false} className="[--notch:5mm]" stub={<StubText>Gratis</StubText>}>
        <div className="flex items-center" style={{ gap: "9mm", padding: "2mm" }}>
          <div className="shrink-0 [&_svg]:block [&_svg]:h-auto [&_svg]:w-full" style={{ width: "86mm" }} dangerouslySetInnerHTML={{ __html: qr }} />
          <ol className="text-ink" style={{ fontSize: "14pt", lineHeight: 1.25 }}>
            {["Abre la cámara del teléfono", "Apunta a este código", "Sube una foto aquí en la tienda"].map((t, i) => (
              <li key={t} className="flex items-baseline" style={{ gap: "3mm", marginBottom: "5mm" }}>
                <span className="font-narrow text-pink font-extrabold" style={{ fontSize: "30pt", lineHeight: 0.8 }}>
                  {i + 1}
                </span>
                <span className="font-semibold">{t}</span>
              </li>
            ))}
          </ol>
        </div>
      </Ticket>
      </div>

      <div className="relative flex items-end justify-between" style={{ gap: "8mm" }}>
        <div>
          <p style={{ fontSize: "13pt", color: "rgb(255 255 255 / 0.8)" }}>Estás en</p>
          <p className="font-wide font-extrabold" style={{ fontSize: "30pt", lineHeight: 1 }}>
            {storeName}
          </p>
        </div>
        <p className="text-sun shrink-0 text-right font-semibold" style={{ fontSize: "13pt" }}>
          @{RAFFLE.instagram}
        </p>
      </div>
    </section>
  );
}
