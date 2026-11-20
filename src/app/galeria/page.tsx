import { GalleryGrid, RankingList } from "@/components/gallery";
import { SiteShell } from "@/components/site-shell";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { publicGallery, publicRanking } from "@/lib/data";

const PAGE = 48;

export const dynamic = "force-dynamic";
export const metadata = { title: "Galería | Sorteo GTA 6 TechnoCell" };

export default async function Galeria({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const page = Math.max(1, Math.min(200, Number((await searchParams).pagina) || 1));
  // pedimos una de más para saber si hay otra página
  const [all, ranking] = await Promise.all([publicGallery(PAGE + 1, (page - 1) * PAGE), publicRanking(10)]);
  const items = all.slice(0, PAGE);
  const hasMore = all.length > PAGE;
  return (
    <SiteShell
      band={
        <div className="mx-auto max-w-5xl px-5 pt-4 pb-4">
          <h1 className="font-wide text-[34px] leading-[0.95] font-extrabold tracking-tight sm:text-5xl">Galería</h1>
          <p className="mt-2 text-white/85">Las fotos de todos los que están participando.</p>
        </div>
      }
    >
      <div className="grid gap-10 pt-10 lg:grid-cols-[1fr_300px]">
        <div>
          <GalleryGrid items={items} empty={page > 1 ? "No hay más fotos por aquí." : undefined} />
          {(hasMore || page > 1) && (
            <nav className="mt-8 flex justify-center gap-3" aria-label="Más fotos">
              {page > 1 && (
                <Button asChild variant="outline" size="lg">
                  <Link href={page === 2 ? "/galeria" : `/galeria?pagina=${page - 1}`}>Más recientes</Link>
                </Button>
              )}
              {hasMore && (
                <Button asChild variant="cta" size="lg">
                  <Link href={`/galeria?pagina=${page + 1}`}>Ver más fotos</Link>
                </Button>
              )}
            </nav>
          )}
        </div>
        <aside aria-labelledby="top">
          <h2 id="top" className="font-wide text-xl font-extrabold">
            Tabla de puntos
          </h2>
          <div className="mt-4">
            <RankingList rows={ranking} />
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
