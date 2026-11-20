import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { StubText, Ticket } from "@/components/ticket";
import { Tilt } from "@/components/fx/tilt";
import { WantedStars } from "@/components/vice";
import { Button } from "@/components/ui/button";
import { GalleryGrid, RankingList } from "@/components/gallery";
import { Live } from "@/components/fx/live";
import { ContestVideo } from "@/components/contest-video";
import { activeStores, getRaffleDates, publicGallery, publicRanking, publicWinner } from "@/lib/data";
import { daysUntil, formatDate, RAFFLE, raffleClosed, raffleNotStarted } from "@/lib/config";

export const dynamic = "force-dynamic";

const baseSteps = [
  { title: "Escanea el QR en la tienda", text: "Está en la entrada o junto a la caja de cada tienda TechnoCell. Usa la cámara del teléfono." },
  {
    title: "Sube una foto o un video",
    text: `Que sea creativo: sale en la galería. Foto suma ${RAFFLE.points.photo} puntos y video ${RAFFLE.points.video}.`,
  },
];

export default async function Home() {
  const [stores, gallery, ranking, dates, winner] = await Promise.all([
    activeStores(),
    publicGallery(8),
    publicRanking(10),
    getRaffleDates(),
    publicWinner(),
  ]);
  const { closesAt, startsAt, announceAt, contestUrl } = dates;
  const closed = raffleClosed(closesAt);
  const notStarted = raffleNotStarted(startsAt);
  const toStart = daysUntil(startsAt);
  const daysLeft = daysUntil(closesAt) + 1;
  const countdown = closed
    ? "Cerrado"
    : notStarted
      ? toStart === 1
        ? "Empieza mañana"
        : `Empieza en ${toStart} días`
      : daysLeft === 1
        ? "Último día"
        : `Quedan ${daysLeft} días`;
  const steps = [
    ...(contestUrl ? [{ title: "Comenta el video del concurso", text: `En nuestro Instagram @${RAFFLE.instagram}. Es requisito para ganar.` }] : []),
    ...baseSteps,
  ];
  const p = RAFFLE.points;
  const closes = formatDate(closesAt);

  const earn = [
    { what: "Video creativo en una tienda", note: `Contigo en cámara y tu emoción por el ${RAFFLE.prize}`, n: `+${p.video}` },
    { what: "Foto en una tienda", note: "Que se vea la tienda o el cartel. Una vez al día por tienda", n: `+${p.photo}` },
    { what: `Visitar las ${stores.length} tiendas`, note: "Se suma solo al completar la última", n: `+${p.allStoresBonus}` },
    { what: "Publicar tu foto en Instagram", note: `Etiquetando a @${RAFFLE.instagram}`, n: `+${p.post}` },
  ];

  const rules = [
    "Pueden participar mayores de 18 años. Se necesita la cédula para reclamar el premio.",
    "Cada punto es una oportunidad: el ganador sale al azar y quien tiene más puntos tiene más chances.",
    "Las fotos se publican en la galería con tu nombre y la inicial de tu apellido. Nunca mostramos tu cédula ni tu teléfono.",
    `Cada foto o video debe ser en la tienda donde escaneaste el QR, contigo en cámara. Los videos deben mostrar tu emoción por el ${RAFFLE.prize}.`,
    "Antes de entregar el premio revisamos todas las fotos y videos del ganador. Si no cumplen, se anula y se sortea de nuevo.",
    "Una foto o video ofensivo se quita de la galería en cualquier momento.",
    "Las publicaciones de Instagram se suman cuando el equipo las confirma.",
    ...(contestUrl ? [`Para ganar hay que comentar el video del concurso en @${RAFFLE.instagram}. No suma puntos, pero lo revisamos antes de entregar el premio.`] : []),
    `Se participa del ${formatDate(startsAt)} al ${closes}. Anunciamos al ganador el ${formatDate(announceAt)} y lo llamamos al teléfono que registró.`,
  ];

  return (
    <SiteShell
      scene="full"
      band={
        <section className="mx-auto grid max-w-5xl items-center gap-10 px-5 pt-6 md:grid-cols-[1.1fr_1fr] md:pt-12">
          <div>
            <h1 className="font-wide text-[40px] leading-[0.95] font-extrabold tracking-tight text-balance [text-shadow:0_3px_0_rgb(27_8_51/0.6)] sm:text-6xl">
              {`Sorteamos un ${RAFFLE.prize.replace(" ", "\u00a0")} entre quienes nos visiten`.split(" ").map((w, i) => (
                <span key={i} className="word-up" style={{ "--i": i } as React.CSSProperties}>
                  {w}&nbsp;
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-white/85">
              Es gratis. Escanea el código QR en cualquiera de nuestras tiendas y sube una foto o un video creativo. Mientras más
              tiendas visites, más puntos y más chances de ganar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="cta" size="lg">
                <Link href="/galeria">Ver la galería</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="bg-ink/30 text-white ring-1 ring-white/40 hover:bg-white/10 hover:text-white">
                <Link href="/mis-puntos">Consultar mis puntos</Link>
              </Button>
            </div>
          </div>

          <Tilt className="mx-auto w-full max-w-sm">
            <div className="tilt-shadow" aria-hidden />
            <Ticket tilt={false} sheen stub={<StubText>Gratis</StubText>}>
            <p className="text-muted-foreground text-sm">Boleto del sorteo</p>
            <p className="font-wide vice-text mt-1 pb-1 text-[64px] leading-[0.9] font-black tracking-tight">{RAFFLE.prize}</p>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-dashed border-ink/20 pt-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Tiendas</dt>
                <dd className="font-narrow text-2xl font-bold">{stores.length}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{notStarted ? "Empieza" : closed ? "Cerró" : "Cierra"}</dt>
                <dd className="font-narrow text-2xl leading-tight font-bold">{notStarted ? formatDate(startsAt) : closes}</dd>
                <dd className="text-pink text-sm font-bold">{countdown}</dd>
              </div>
            </dl>
            </Ticket>
            {/* insignia que flota por encima del boleto */}
            <div className="float-z bg-ink absolute -top-5 -left-3 flex items-center gap-1 rounded-md px-2.5 py-1.5 shadow-lg">
              <WantedStars filled={5} total={5} small className="flex" />
            </div>
            <div className="float-z-sm bg-sky text-ink font-narrow absolute -right-3 -bottom-4 rounded-md px-3 py-1 text-lg font-extrabold shadow-lg">
              +{p.allStoresBonus} pts
            </div>
          </Tilt>
        </section>
      }
    >
      {closed && (
        <section className="pt-12" aria-live="polite">
          <div className="bg-ink rounded-lg p-6 text-center text-white sm:p-8">
            {winner ? (
              <>
                <p className="text-white/80">Ganador del {RAFFLE.prize}</p>
                <p className="hud-text font-wide mt-2 text-4xl font-black sm:text-6xl">{winner.name}</p>
                <p className="mt-3 text-white/80">
                  Con {winner.points} puntos. ¡Gracias a todos por participar!
                </p>
              </>
            ) : (
              <>
                <p className="font-wide text-2xl font-extrabold sm:text-3xl">El sorteo cerró el {closes}</p>
                <p className="mt-2 text-white/80">
                  Estamos revisando las fotos y videos. Anunciamos al ganador el {formatDate(announceAt)} aquí y en @{RAFFLE.instagram}.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {contestUrl && !closed && <ContestVideo url={contestUrl} className="mt-12" />}

      <section className="py-14" aria-labelledby="como">
        <h2 id="como" className="font-wide text-2xl font-extrabold tracking-tight sm:text-3xl">
          Cómo participar
        </h2>
        <ol className="mt-8 grid gap-8 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} data-reveal style={{ "--i": i } as React.CSSProperties} className="grid grid-cols-[auto_1fr] gap-4">
              <span className="font-narrow text-pink text-6xl leading-[0.8] font-extrabold">{i + 1}</span>
              <div>
                <h3 className="font-bold">{s.title}</h3>
                <p className="text-muted-foreground mt-1 leading-relaxed">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-12 border-t py-14 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="galeria">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="galeria" className="font-wide text-2xl font-extrabold tracking-tight sm:text-3xl">
              Galería
            </h2>
            <Link href="/galeria" className="text-violet font-semibold underline-offset-4 hover:underline">
              Ver todas las fotos
            </Link>
          </div>
          <div className="mt-6">
            <GalleryGrid items={gallery} />
          </div>
        </section>
        <section aria-labelledby="tabla">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="tabla" className="font-wide text-2xl font-extrabold tracking-tight">
              Tabla de puntos
            </h2>
            <Live seconds={30} className="text-muted-foreground" />
          </div>
          <div className="mt-6">
            <RankingList rows={ranking} />
          </div>
        </section>
      </div>

      <div className="grid gap-12 border-t py-14 md:grid-cols-2">
        <section aria-labelledby="puntos">
          <h2 id="puntos" className="font-wide text-2xl font-extrabold tracking-tight">
            Cómo sumar puntos
          </h2>
          <ul className="mt-6 divide-y border-y">
            {earn.map((e, i) => (
              <li key={e.what} data-reveal style={{ "--i": i } as React.CSSProperties} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold">{e.what}</p>
                  <p className="text-muted-foreground text-sm">{e.note}</p>
                </div>
                <span className="font-narrow text-violet text-4xl font-extrabold tabular-nums">{e.n}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="tiendas" aria-labelledby="tiendas-h" className="scroll-mt-6">
          <h2 id="tiendas-h" className="font-wide text-2xl font-extrabold tracking-tight">
            Tiendas participantes
          </h2>
          <ul className="mt-6 divide-y border-y">
            {stores.map((s) => (
              <li key={s.id} className="flex items-baseline justify-between gap-4 py-3.5">
                <span className="font-semibold">{s.name}</span>
                {s.city && <span className="text-muted-foreground text-sm">{s.city}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section id="reglas" aria-labelledby="reglas-h" className="scroll-mt-6 border-t pt-14">
        <h2 id="reglas-h" className="font-wide text-2xl font-extrabold tracking-tight">
          Reglas
        </h2>
        <ul className="mt-6 max-w-[65ch] list-disc space-y-2.5 pl-5 leading-relaxed marker:text-pink">
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>
    </SiteShell>
  );
}
