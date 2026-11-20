import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell
      band={
        <div className="mx-auto max-w-5xl px-5 pt-4 pb-4">
          <h1 className="font-wide text-[34px] leading-[0.95] font-extrabold tracking-tight">Este código QR no funciona</h1>
        </div>
      }
    >
      <div className="bg-card mx-auto -mt-10 max-w-md rounded-lg border p-6">
        <p className="leading-relaxed">
          Puede que el cartel sea viejo o que la foto del código esté cortada. Vuelve a escanear el cartel de la tienda o pídele
          ayuda al personal.
        </p>
        <Button asChild variant="cta" size="lg" className="mt-5 w-full">
          <Link href="/">Ir a la página del sorteo</Link>
        </Button>
      </div>
    </SiteShell>
  );
}
