"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="public grid min-h-dvh place-items-center p-6">
      <div className="bg-card max-w-md rounded-lg border p-6 text-center">
        <h1 className="font-wide text-2xl font-extrabold">Algo no cargó bien</h1>
        <p className="text-muted-foreground mt-2 leading-relaxed">
          Puede ser la conexión. Tus puntos están guardados: vuelve a intentarlo en unos segundos.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="cta" size="lg" onClick={reset}>
            Reintentar
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
