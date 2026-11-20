import { notFound } from "next/navigation";
import { CheckinFlow } from "@/components/checkin-flow";
import { SiteShell } from "@/components/site-shell";
import { getClosesAt, participantName, storeByToken } from "@/lib/data";
import { formatDate, RAFFLE, raffleClosed } from "@/lib/config";
import { getParticipantId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StorePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await storeByToken(token);
  if (!store) notFound();
  const pid = await getParticipantId();
  const known = pid ? await participantName(pid) : null;
  const closesAt = await getClosesAt();
  const closed = raffleClosed(closesAt);

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
        {closed ? (
          <div className="bg-card rounded-lg border p-6">
            <h2 className="text-xl font-bold">El sorteo cerró el {formatDate(closesAt)}</h2>
            <p className="text-muted-foreground mt-2">Gracias por participar. Anunciaremos al ganador en @{RAFFLE.instagram}.</p>
          </div>
        ) : (
          <CheckinFlow token={token} storeName={store.name} known={known} />
        )}
      </div>
    </SiteShell>
  );
}
