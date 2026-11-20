import { notFound } from "next/navigation";
import { CheckinFlow } from "@/components/checkin-flow";
import { SiteShell } from "@/components/site-shell";
import { ContestVideo } from "@/components/contest-video";
import { getRaffleDates, participantName, storeByToken } from "@/lib/data";
import { formatDate, RAFFLE, registrationState } from "@/lib/config";
import { getParticipantId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await storeByToken(token);
  if (!store) notFound();
  const pid = await getParticipantId();
  const known = pid ? await participantName(pid) : null;
  const dates = await getRaffleDates();
  const { closesAt, startsAt } = dates;
  const state = registrationState(dates);
  const closed = state === "cerrado";
  const notStarted = state === "antes";
  const paused = state === "pausado";

  return (
    <SiteShell
      band={
        <div className="mx-auto max-w-5xl px-5 pt-4 pb-4">
          <p className="text-white/75">Sorteo gratuito de {RAFFLE.prize}</p>
          <h1 className="font-wide mt-1 text-[34px] leading-[0.95] font-extrabold tracking-tight text-balance sm:text-5xl">{store.name}</h1>
          {store.city && <p className="text-sun mt-2 font-semibold">{store.city}</p>}
        </div>
      }
    >
      <div className="mx-auto -mt-10 max-w-md">
        {paused ? (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-bold">El registro está pausado por un momento</h2>
            <p className="text-muted-foreground mt-2">Vuelve a escanear el código en unos minutos. Tus puntos están guardados.</p>
          </div>
        ) : notStarted ? (
          <div className="space-y-4">
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-bold">El sorteo empieza el {formatDate(startsAt)}</h2>
              <p className="text-muted-foreground mt-2">
                Desde ese día podrás escanear este código, subir tu foto o video y sumar puntos. Se participa hasta el {formatDate(closesAt)}.
              </p>
            </div>
            {dates.contestUrl && <ContestVideo url={dates.contestUrl} compact />}
          </div>
        ) : closed ? (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-bold">El sorteo cerró el {formatDate(closesAt)}</h2>
            <p className="text-muted-foreground mt-2">Gracias por participar. Anunciaremos al ganador en @{RAFFLE.instagram}.</p>
          </div>
        ) : (
          <CheckinFlow token={token} storeName={store.name} known={known} contestUrl={dates.contestUrl} />
        )}
      </div>
    </SiteShell>
  );
}
