import { LookupForm } from "@/components/lookup-form";
import { Live } from "@/components/fx/live";
import { SiteShell } from "@/components/site-shell";
import { getPassport } from "@/lib/data";
import { getParticipantId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mis puntos | Sorteo TechnoCell" };

export default async function MisPuntos() {
  const pid = await getParticipantId();
  const passport = pid ? await getPassport(pid) : null;
  return (
    <SiteShell
      band={
        <div className="mx-auto max-w-5xl px-5 pt-4 pb-4">
          <h1 className="font-wide text-[34px] leading-[0.95] font-extrabold tracking-tight sm:text-5xl">Mis puntos</h1>
        </div>
      }
    >
      <div className="mx-auto -mt-10 max-w-md">
        <LookupForm initial={passport} />
        {passport && <Live seconds={45} label={false} />}
      </div>
    </SiteShell>
  );
}
