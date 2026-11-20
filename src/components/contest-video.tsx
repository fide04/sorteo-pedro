import { Instagram } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { RAFFLE } from "@/lib/config";
import { cn } from "@/lib/utils";

/** Video del concurso en Instagram: requisito para participar (no suma puntos). */
export function ContestVideo({ url, compact = false, className }: { url: string; compact?: boolean; className?: string }) {
  const embed = url.replace(/\/?$/, "/") + "embed";
  return (
    <section aria-labelledby="video-concurso" className={cn("bg-card rounded-lg border p-5", className)}>
      <div className={cn("grid items-center gap-5", !compact && "md:grid-cols-[1fr_minmax(0,340px)]")}>
        <div>
          <h2 id="video-concurso" className="font-wide text-xl font-extrabold sm:text-2xl">
            Comenta el video del concurso
          </h2>
          <p className="text-muted-foreground mt-2 leading-relaxed">
            Es requisito para ganar: entra al video en @{RAFFLE.instagram}, dale me gusta y déjanos un comentario. No suma puntos, pero lo revisamos antes de
            entregar el premio.
          </p>
          <Button asChild variant="cta" size="lg" className="mt-4 w-full sm:w-auto">
            <a href={url} target="_blank" rel="noreferrer">
              <Instagram className="size-5" /> Comentar en Instagram
            </a>
          </Button>
        </div>
        {!compact && (
          <iframe
            src={embed}
            title="Video del concurso en Instagram"
            loading="lazy"
            className="mx-auto hidden h-[520px] w-full max-w-[340px] rounded-md border bg-white md:block"
            allow="encrypted-media"
          />
        )}
      </div>
    </section>
  );
}
