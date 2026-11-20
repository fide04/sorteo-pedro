import { LogOut } from "lucide-react";
import { logout } from "../actions";
import { AdminNav } from "@/components/admin/nav";
import { Button } from "@/components/ui/button";
import { RAFFLE } from "@/lib/config";
import { currentAdmin, requireAdmin } from "@/lib/session";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel | Sorteo TechnoCell", robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const who = await currentAdmin();
  const [{ count }, { count: videos }] = await Promise.all([
    db().from("social_claims").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
    db().from("checkins").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
  ]);
  const { count: pendingDraws } = await db().from("draws").select("id", { count: "exact", head: true }).eq("status", "por_verificar");
  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 print:max-w-none print:space-y-0 print:p-0">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">{RAFFLE.brand}</p>
          <h1 className="font-wide text-2xl font-extrabold tracking-tight">
            Sorteo {RAFFLE.prize}
          </h1>
        </div>
        <form action={logout} className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">
            Sesión: <b className="text-foreground">{who}</b>
          </span>
          <Button variant="ghost" size="sm">
            <LogOut /> Salir
          </Button>
        </form>
      </header>
      <div className="no-print">
        <AdminNav badges={{ "/admin/instagram": count ?? 0, "/admin/registros": videos ?? 0, "/admin/sorteo": pendingDraws ?? 0 }} />
      </div>
      {children}
    </div>
  );
}
