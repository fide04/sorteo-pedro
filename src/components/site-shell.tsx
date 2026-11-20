import Link from "next/link";
import { ViceScene } from "@/components/vice";
import { SceneMotion } from "@/components/fx/scene-motion";
import { RAFFLE } from "@/lib/config";
import { cn } from "@/lib/utils";

export function Wordmark() {
  return (
    <Link href="/" className="font-wide text-[17px] leading-none font-extrabold tracking-tight text-white">
      TechnoCell <span className="font-normal text-sky">2015</span>
    </Link>
  );
}

/** Estructura del sitio público: franja azul de marca arriba, contenido sobre fondo claro. */
export function SiteShell({
  band,
  scene = "compact",
  children,
}: {
  band?: React.ReactNode;
  scene?: "full" | "compact";
  children: React.ReactNode;
}) {
  return (
    <div className="public flex min-h-dvh flex-col">
      <div className={cn("vice-sky relative overflow-hidden text-white", scene === "full" ? "pb-[190px] md:pb-[230px]" : "pb-[112px]")}>
        <ViceScene
          compact={scene === "compact"}
          className={cn("pointer-events-none absolute inset-x-0 bottom-0", scene === "full" ? "h-[230px] md:h-[300px]" : "h-[130px]")}
        />
        <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
          <Wordmark />
          <nav className="flex gap-5 text-sm font-semibold text-white/85">
            <Link href="/galeria" className="underline-offset-4 hover:text-white hover:underline">
              Galería
            </Link>
            <Link href="/mis-puntos" className="underline-offset-4 hover:text-white hover:underline">
              Mis puntos
            </Link>
          </nav>
        </header>
        <div className="relative">{band}</div>
      </div>
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 px-5 pb-16">{children}</main>
      <SceneMotion />
      <footer className="bg-ink text-sm text-white/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p>{RAFFLE.brand}. Sorteo gratuito, no requiere compra.</p>
          <nav className="flex gap-5">
            <Link href="/#reglas" className="hover:text-white">Reglas</Link>
            <a href={`https://instagram.com/${RAFFLE.instagram}`} target="_blank" rel="noreferrer" className="hover:text-white">
              Instagram
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
