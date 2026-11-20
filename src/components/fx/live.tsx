"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Actualización en vivo: vuelve a pedir los datos al servidor cada `seconds` segundos
 * (router.refresh conserva lo que el usuario está escribiendo o el diálogo abierto).
 * Se pausa si la pestaña no está visible y se actualiza al volver a ella.
 */
export function Live({ seconds = 20, label = true, className }: { seconds?: number; label?: boolean; className?: string }) {
  const router = useRouter();
  const [last, setLast] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => {
      if (document.hidden) return;
      router.refresh();
      setLast(Date.now());
    };
    const t = setInterval(refresh, seconds * 1000);
    const tick = setInterval(() => setNow(Date.now()), 5000);
    const onVisible = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, seconds]);

  if (!label) return null;
  const ago = Math.max(0, Math.round((now - last) / 1000));
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)} aria-live="off">
      <span className="relative flex size-2">
        <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" />
        <span className="bg-success relative inline-flex size-2 rounded-full" />
      </span>
      En vivo{ago >= 5 ? ` · hace ${ago} s` : ""}
    </span>
  );
}
